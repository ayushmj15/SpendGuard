"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getBudgetSummary } from "@/services/spending";

export interface LockStatus {
  enabled: boolean;
  amount: number | null; // configured cap (0 = use budget remaining)
  remaining: number; // current remaining budget
  lockedAmount: number; // effective available amount
  overBudget: boolean;
}

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getSpendingLockAction(): Promise<LockStatus> {
  const userId = await getUserId();
  const settings = await db.userSettings.findUnique({ where: { userId } });
  const summary = await getBudgetSummary(userId);

  const amount = settings?.spendingLockAmount ?? 0;
  const effectiveRemaining = amount && amount > 0 ? amount : summary.remaining;
  const enabled = !!settings?.spendingLockEnabled;
  const overBudget = enabled && summary.remaining < 0;

  return {
    enabled,
    amount,
    remaining: summary.remaining,
    lockedAmount: Math.max(0, effectiveRemaining),
    overBudget,
  };
}

export async function setSpendingLockAction(
  enabled: boolean,
  amount: number | null,
): Promise<LockStatus> {
  const userId = await getUserId();
  const existing = await db.userSettings.findUnique({ where: { userId } });

  const data = {
    spendingLockEnabled: enabled,
    spendingLockAmount: amount && amount > 0 ? amount : null,
  };

  if (existing) {
    await db.userSettings.update({ where: { userId }, data });
  } else {
    await db.userSettings.create({ data: { userId, ...data } as never });
  }

  for (const path of ["/dashboard", "/settings", "/transactions"]) {
    revalidatePath(path);
  }

  return getSpendingLockAction();
}
