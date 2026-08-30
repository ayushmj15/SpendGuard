"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { transactionSchema } from "@/lib/validations/transaction";
import { categoryIconKey } from "@/lib/constants";
import { getActivePeriod } from "@/services/spending";

export interface ImportRowInput {
  date?: string;
  type?: string;
  amount?: number | string;
  category?: string;
  paymentMethod?: string;
  description?: string;
  note?: string;
}

export interface ImportResultRow {
  index: number;
  ok: boolean;
  error?: string;
}

export interface ImportActionResult {
  ok: boolean;
  error?: string;
  imported: number;
  failed: number;
  results: ImportResultRow[];
}

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function normalizeType(v?: string): "EXPENSE" | "INCOME" | undefined {
  if (!v) return undefined;
  const upper = v.trim().toUpperCase();
  if (upper.startsWith("EXP")) return "EXPENSE";
  if (upper.startsWith("INC")) return "INCOME";
  return undefined;
}

function normalizePayment(v?: string): string | undefined {
  if (!v) return undefined;
  const map: Record<string, string> = {
    UPI: "UPI",
    DEBIT: "DEBIT_CARD",
    DEBIT_CARD: "DEBIT_CARD",
    CREDIT: "CREDIT_CARD",
    CREDIT_CARD: "CREDIT_CARD",
    CASH: "CASH",
    CARD: "OTHER",
    TRANSFER: "BANK_TRANSFER",
    BANK: "BANK_TRANSFER",
    BANK_TRANSFER: "BANK_TRANSFER",
    OTHER: "OTHER",
  };
  const key = v.trim().toUpperCase().replace(/[^A-Z_]/g, "");
  return map[key] ?? (key ? "OTHER" : undefined);
}

async function resolveCategory(userId: string, name?: string): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();
  const categories = await db.category.findMany({ where: { userId } });
  const lower = trimmed.toLowerCase();
  const existing = categories.find((c) => c.name.toLowerCase() === lower);
  if (existing) return existing.id;

  const created = await db.category.create({
    data: {
      userId,
      name: trimmed,
      icon: categoryIconKey(trimmed),
      isDefault: false,
    },
  });
  return created.id;
}

export async function importTransactionsAction(
  rows: ImportRowInput[],
): Promise<ImportActionResult> {
  try {
    const userId = await getUserId();
    const imported: ImportResultRow[] = [];
    let importedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const categoryId = await resolveCategory(userId, r.category);
        if (!categoryId) {
          imported.push({ index: i, ok: false, error: "Missing category" });
          failedCount++;
          continue;
        }

        const parsed = transactionSchema.safeParse({
          type: normalizeType(r.type) ?? "EXPENSE",
          amount: typeof r.amount === "number" ? r.amount : parseFloat(String(r.amount ?? "")),
          categoryId,
          date: r.date ? new Date(r.date) : new Date(),
          paymentMethod: normalizePayment(r.paymentMethod) ?? "OTHER",
          description: r.description ?? "",
          note: r.note ?? "",
        });

        if (!parsed.success) {
          imported.push({ index: i, ok: false, error: parsed.error.issues[0]?.message ?? "Invalid row" });
          failedCount++;
          continue;
        }

        await db.transaction.create({
          data: {
            userId,
            categoryId,
            type: parsed.data.type,
            amount: parsed.data.amount,
            description: parsed.data.description || null,
            note: parsed.data.note || null,
            paymentMethod: parsed.data.paymentMethod as never,
            date: parsed.data.date,
          },
        });

        imported.push({ index: i, ok: true });
        importedCount++;
      } catch (err) {
        imported.push({
          index: i,
          ok: false,
          error: err instanceof Error ? err.message : "Failed to import row",
        });
        failedCount++;
      }
    }

    const activePeriod = await getActivePeriod(userId);
    if (activePeriod) {
      await db.transaction.count({ where: { userId, date: { gte: activePeriod.startDate, lte: activePeriod.endDate } } });
    }

    for (const path of ["/dashboard", "/transactions", "/budget", "/insights", "/reports"]) {
      revalidatePath(path);
    }

    return { ok: true, imported: importedCount, failed: failedCount, results: imported };
  } catch (err) {
    console.error("importTransactionsAction error:", err);
    return { ok: false, error: "Failed to import transactions", imported: 0, failed: rows.length, results: [] };
  }
}
