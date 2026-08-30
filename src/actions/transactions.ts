"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { transactionSchema } from "@/lib/validations/transaction";
import { getActivePeriod, getPeriodSpending } from "@/services/spending";
import {
  generateBudgetAlerts,
  generateCategoryAlert,
  reconcileBudgetNotifications,
} from "@/services/notification";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export interface TransactionActionResult {
  ok: boolean;
  error?: string;
  coolDown?: {
    amount: number;
    remaining: number;
    pctOfRemaining: number;
  };
  impulse?: {
    amount: number;
    threshold: number;
  };
}

/** After any expense mutation, refresh budget/category notifications. */
async function refreshNotifications(
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  const { spent } = await getPeriodSpending(userId, startDate, endDate);
  const settings = await db.userSettings.findUnique({ where: { userId } });
  const period = await getActivePeriod(userId);
  if (!period) return;

  const ctx = {
    spent,
    budget: period.amount,
    thresholds: (settings?.warningThresholds as Record<string, number>) ?? {},
    overshoot: spent > period.amount ? spent - period.amount : 0,
  };
  await reconcileBudgetNotifications(userId, ctx);

  // Category alerts
  const categories = await db.category.findMany({
    where: { userId, budget: { not: null } },
    select: { id: true, name: true, budget: true, transactions: { where: { type: "EXPENSE", date: { gte: startDate, lte: endDate } }, select: { amount: true } } },
  });
  for (const cat of categories) {
    const catSpent = cat.transactions.reduce((s, t) => s + t.amount, 0);
    await generateCategoryAlert(userId, {
      categoryName: cat.name,
      spent: catSpent,
      budget: cat.budget ?? 0,
    });
  }
}

export async function createTransactionAction(
  input: FormData | { type: string; amount: number; categoryId: string; date: Date; paymentMethod: string; description?: string; note?: string },
): Promise<TransactionActionResult> {
  try {
    const userId = await getUserId();

    let data: unknown;
    if (input instanceof FormData) {
      data = {
        type: input.get("type"),
        amount: parseFloat(input.get("amount") as string),
        categoryId: input.get("categoryId"),
        date: input.get("date") ? new Date(input.get("date") as string) : new Date(),
        paymentMethod: input.get("paymentMethod"),
        description: input.get("description") ?? "",
        note: input.get("note") ?? "",
      };
    } else {
      data = input;
    }

    const parsed = transactionSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transaction" };
    }

    // Verify the category belongs to this user (authorization)
    const category = await db.category.findFirst({
      where: { id: parsed.data.categoryId, userId },
    });
    if (!category) {
      return { ok: false, error: "Invalid category" };
    }

    const settings = await db.userSettings.findUnique({ where: { userId } });
    const maxAmount = settings?.maxTransactionAmount ?? 100000;
    if (parsed.data.amount > maxAmount) {
      return { ok: false, error: `Amount exceeds the maximum of ${maxAmount}` };
    }

    // Determine cool-down / impulse warnings (only relevant pre-create, based on current remaining)
    let coolDown: TransactionActionResult["coolDown"];
    let impulse: TransactionActionResult["impulse"];

    if (parsed.data.type === "EXPENSE") {
      const period = await getActivePeriod(userId, parsed.data.date);
      if (period) {
        const { spent } = await getPeriodSpending(userId, period.startDate, period.endDate);
        const remaining = period.amount - spent;
        const cooldownThreshold = settings?.coolDownThreshold ?? 0.1;
        const impulseThreshold = settings?.impulseThreshold ?? 0;

        if (remaining > 0 && parsed.data.amount / remaining > cooldownThreshold) {
          coolDown = {
            amount: parsed.data.amount,
            remaining: Math.max(0, remaining),
            pctOfRemaining: (parsed.data.amount / remaining) * 100,
          };
        }
        if (impulseThreshold > 0 && parsed.data.amount > impulseThreshold) {
          impulse = { amount: parsed.data.amount, threshold: impulseThreshold };
        }
      }
    }

    // Spending Lock: when enabled, block expenses that exceed the remaining budget
    if (parsed.data.type === "EXPENSE" && settings?.spendingLockEnabled) {
      const period = await getActivePeriod(userId, parsed.data.date);
      if (period) {
        const { spent } = await getPeriodSpending(userId, period.startDate, period.endDate);
        const remaining = period.amount - spent;
        if (parsed.data.amount > remaining) {
          return {
            ok: false,
            error: "Spending is locked — this would exceed your remaining budget",
          };
        }
      }
    }

    const created = await db.transaction.create({
      data: {
        userId,
        categoryId: parsed.data.categoryId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        note: parsed.data.note || null,
        paymentMethod: parsed.data.paymentMethod as never,
        date: parsed.data.date,
      },
    });

    // Refresh notifications based on the active period
    const activePeriod = await getActivePeriod(userId);
    if (activePeriod) {
      await refreshNotifications(userId, activePeriod.startDate, activePeriod.endDate);
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/budget");
    revalidatePath("/insights");
    revalidatePath("/reports");

    return { ok: true, coolDown, impulse };
  } catch (err) {
    console.error("createTransactionAction error:", err);
    return { ok: false, error: "Failed to save expense" };
  }
}

export async function updateTransactionAction(
  id: string,
  input: FormData | Record<string, unknown>,
): Promise<TransactionActionResult> {
  try {
    const userId = await getUserId();

    let data: unknown;
    if (input instanceof FormData) {
      data = {
        type: input.get("type"),
        amount: parseFloat(input.get("amount") as string),
        categoryId: input.get("categoryId"),
        date: input.get("date") ? new Date(input.get("date") as string) : new Date(),
        paymentMethod: input.get("paymentMethod"),
        description: input.get("description") ?? "",
        note: input.get("note") ?? "",
      };
    } else {
      data = input;
    }

    const parsed = transactionSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transaction" };
    }

    // Authorization: transaction must belong to user
    const existing = await db.transaction.findFirst({ where: { id, userId } });
    if (!existing) return { ok: false, error: "Transaction not found" };

    const category = await db.category.findFirst({
      where: { id: parsed.data.categoryId, userId },
    });
    if (!category) return { ok: false, error: "Invalid category" };

    await db.transaction.update({
      where: { id },
      data: {
        categoryId: parsed.data.categoryId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        note: parsed.data.note || null,
        paymentMethod: parsed.data.paymentMethod as never,
        date: parsed.data.date,
      },
    });

    const activePeriod = await getActivePeriod(userId);
    if (activePeriod) {
      await refreshNotifications(userId, activePeriod.startDate, activePeriod.endDate);
    }

    for (const path of ["/dashboard", "/transactions", "/budget", "/insights", "/reports"]) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch (err) {
    console.error("updateTransactionAction error:", err);
    return { ok: false, error: "Failed to update transaction" };
  }
}

export async function deleteTransactionAction(id: string): Promise<TransactionActionResult> {
  try {
    const userId = await getUserId();
    const existing = await db.transaction.findFirst({ where: { id, userId } });
    if (!existing) return { ok: false, error: "Transaction not found" };

    await db.transaction.delete({ where: { id } });

    const activePeriod = await getActivePeriod(userId);
    if (activePeriod) {
      await refreshNotifications(userId, activePeriod.startDate, activePeriod.endDate);
    }

    for (const path of ["/dashboard", "/transactions", "/budget", "/insights", "/reports"]) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch (err) {
    console.error("deleteTransactionAction error:", err);
    return { ok: false, error: "Failed to delete transaction" };
  }
}
