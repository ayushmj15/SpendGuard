"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getBudgetSummary, getCategoryTotals, getActivePeriod } from "@/services/spending";
import { getReport, normalizeDateInput } from "@/services/report";
import type { BudgetSummary, CategoryTotals } from "@/types";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getCategoriesAction() {
  const userId = await getUserId();
  const categories = await db.category.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return categories;
}

export async function getBudgetSummaryAction(): Promise<BudgetSummary | null> {
  try {
    const userId = await getUserId();
    return await getBudgetSummary(userId);
  } catch {
    return null;
  }
}

export async function getCategoryTotalsAction(
  startDate: Date,
  endDate: Date,
): Promise<CategoryTotals[]> {
  const userId = await getUserId();
  return getCategoryTotals(userId, startDate, endDate);
}

export async function getActivePeriodAction() {
  try {
    const userId = await getUserId();
    return await getActivePeriod(userId);
  } catch {
    return null;
  }
}

export async function getTransactionsAction(opts?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  type?: string;
  from?: string;
  to?: string;
  query?: string;
}) {
  const userId = await getUserId();
  const { limit = 50, offset = 0 } = opts ?? {};

  const where: Record<string, unknown> = { userId };
  if (opts?.categoryId) where.categoryId = opts.categoryId;
  if (opts?.type) where.type = opts.type;
  if (opts?.from || opts?.to) {
    const date: { gte?: Date; lte?: Date } = {};
    if (opts?.from) date.gte = new Date(opts.from);
    if (opts?.to) date.lte = new Date(opts.to);
    where.date = date;
  }
  if (opts?.query) {
    where.description = { contains: opts.query };
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      skip: offset,
      take: limit,
    }),
    db.transaction.count({ where }),
  ]);

  return { transactions, total };
}

export async function getNotificationsAction() {
  const userId = await getUserId();
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getSettingsAction() {
  const userId = await getUserId();
  const [settings, user, budget] = await Promise.all([
    db.userSettings.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    db.budget.findFirst({ where: { userId } }),
  ]);
  return { settings, user, budget };
}

export async function getReportAction(from?: string, to?: string) {
  const userId = await getUserId();
  return getReport(userId, from, to);
}

export async function getReportDefaultsAction() {
  const userId = await getUserId();
  await auth();
  const { fromDate, toDate } = normalizeDateInput();
  const categories = await db.category.count({ where: { userId } });
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    hasCategories: categories > 0,
  };
}

export async function getRecentTransactionsAction(limit = 8) {
  const userId = await getUserId();
  return db.transaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: "desc" },
    take: limit,
  });
}
