"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { TransactionImportService } from "@/services/bank";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export interface ImportRow {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  categoryName?: string; // hint for category matching
  duplicate?: boolean;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
}

/**
 * Imports a list of confirmed CSV rows into transactions.
 * - Matches categories by name (defaulting to "Other").
 * - Detects potential duplicates via signature and skips them.
 * - Multiple rows with identical content are only imported once.
 */
export async function importTransactionsAction(
  rows: ImportRow[],
): Promise<ImportResult> {
  try {
    const userId = await getUserId();

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: "No rows to import" };
    }

    const categories = await db.category.findMany({ where: { userId } });
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const other = byName.get("other");

    if (!other) return { ok: false, error: "Missing 'Other' category" };

    // Existing signatures to skip duplicates
    const existingTxns = await db.transaction.findMany({
      where: { userId },
      select: { date: true, amount: true, description: true },
    });
    const existingSigs = new Set(
      existingTxns.map((t) =>
        TransactionImportService.duplicateSignature({
          date: t.date,
          amount: t.amount,
          description: t.description,
        }),
      ),
    );

    // Also check previously imported rows (raw signature)
    const importedRows = await db.importedTransaction.findMany({
      where: { userId },
      select: { rawData: true },
    });
    for (const ir of importedRows) {
      const raw = ir.rawData as Record<string, unknown> | null;
      if (raw?.sig) existingSigs.add(String(raw.sig));
    }

    let imported = 0;
    let skipped = 0;
    const seenInBatch = new Set<string>();

    for (const row of rows) {
      const d = new Date(row.date);
      if (Number.isNaN(d.getTime())) {
        skipped += 1;
        continue;
      }
      if (!Number.isFinite(row.amount) || row.amount <= 0) {
        skipped += 1;
        continue;
      }

      const sig = TransactionImportService.duplicateSignature({
        date: d,
        amount: row.amount,
        description: row.description,
      });

      if (existingSigs.has(sig) || seenInBatch.has(sig)) {
        skipped += 1;
        continue;
      }

      seenInBatch.add(sig);

      const categoryName =
        row.categoryName && byName.has(row.categoryName.toLowerCase())
          ? byName.get(row.categoryName.toLowerCase())!.id
          : other.id;

      await db.transaction.create({
        data: {
          userId,
          categoryId: categoryName,
          type: row.type,
          amount: row.amount,
          description: row.description || null,
          paymentMethod: "BANK_TRANSFER",
          date: d,
        },
      });

      existingSigs.add(sig);
      imported += 1;
    }

    if (imported > 0) {
      await db.importedTransaction.create({
        data: {
          userId,
          source: "CSV",
          rawData: { count: imported, at: new Date().toISOString() },
        },
      });

      for (const path of ["/dashboard", "/transactions", "/reports"]) {
        revalidatePath(path);
      }
    }

    return { ok: true, imported, skipped };
  } catch (err) {
    console.error("importTransactionsAction error:", err);
    return { ok: false, error: "CSV import failed" };
  }
}
