import { db } from "@/lib/db";
import {
  calculateBudgetPercentage,
  calculateRemainingBudget,
  calculateDailySafeSpend,
  calculateSpendingVelocity,
  toVelocityStatus,
  calculateProjectedSpending,
  calculateProjectedOverrun,
  calculateBudgetStatus,
  calculateCategoryPercentage,
  elapsedDaysInMonth,
  totalDaysInMonth,
  daysRemainingInMonth,
  type BudgetStatusThresholds,
} from "@/utils/calculations";
import { DEFAULT_BUDGET_THRESHOLDS } from "@/utils/calculations";
import type {
  BudgetSummary,
  CategoryTotals,
  DailySpendingPoint,
  HeatmapDay,
} from "@/types";

/** Returns the active budget period for a user on a given date. */
export async function getActivePeriod(userId: string, date = new Date()) {
  return db.budgetPeriod.findFirst({
    where: {
      userId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
    orderBy: { startDate: "desc" },
  });
}

export interface PeriodSpending {
  startDate: Date;
  endDate: Date;
  spent: number;
  income: number;
}

/** Total expense + income within a date range. */
export async function getPeriodSpending(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<PeriodSpending> {
  const [expense, income] = await Promise.all([
    db.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
  ]);
  return {
    startDate,
    endDate,
    spent: expense._sum.amount ?? 0,
    income: income._sum.amount ?? 0,
  };
}

async function getThresholds(userId: string): Promise<BudgetStatusThresholds> {
  const settings = await db.userSettings.findUnique({ where: { userId } });
  const raw = (settings?.warningThresholds as Record<string, number>) ?? {};
  return {
    watch: (raw.budget70 ?? 70) / 100,
    warning: (raw.budget80 ?? 80) / 100,
    critical: (raw.budget90 ?? 90) / 100,
  };
}

/** Full budget summary for the dashboard. */
export async function getBudgetSummary(userId: string): Promise<BudgetSummary> {
  const today = new Date();
  const period = await getActivePeriod(userId, today);

  if (!period) {
    // No budget configured yet
    return {
      spent: 0,
      income: 0,
      budget: 0,
      remaining: 0,
      percentage: 0,
      status: "HEALTHY",
      daysRemaining: daysRemainingInMonth(today),
      dailySafeSpend: 0,
      velocityPct: null,
      velocityStatus: "HEALTHY",
      projected: 0,
      projectedOverrun: 0,
    };
  }

  const { spent, income } = await getPeriodSpending(
    userId,
    period.startDate,
    period.endDate,
  );

  const thresholds = await getThresholds(userId);
  const totalDays = totalDaysInMonth(today);
  const elapsed = elapsedDaysInMonth(today);
  const remainingDays = daysRemainingInMonth(today);
  const remaining = calculateRemainingBudget(spent, period.amount);
  const percentage = calculateBudgetPercentage(spent, period.amount);
  const dailySafeSpend = calculateDailySafeSpend(
    spent,
    period.amount,
    remainingDays,
  );
  const velocityPct = calculateSpendingVelocity(
    spent,
    period.amount,
    elapsed,
    totalDays,
  );
  const projected = calculateProjectedSpending(spent, elapsed, totalDays);
  const projectedOverrun = calculateProjectedOverrun(projected, period.amount);

  return {
    spent,
    income,
    budget: period.amount,
    remaining,
    percentage,
    status: calculateBudgetStatus(spent, period.amount, thresholds),
    daysRemaining: remainingDays,
    dailySafeSpend,
    velocityPct,
    velocityStatus: toVelocityStatus(velocityPct),
    projected,
    projectedOverrun,
  };
}

/** Category-wise totals within the current period (or provided range). */
export async function getCategoryTotals(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<CategoryTotals[]> {
  const categories = await db.category.findMany({
    where: { userId },
    include: {
      transactions: {
        where: { type: "EXPENSE", date: { gte: startDate, lte: endDate } },
        select: { amount: true },
      },
    },
  });

  const thresholdSettings = await db.userSettings.findUnique({
    where: { userId },
  });
  const raw = (thresholdSettings?.warningThresholds as Record<string, number>) ?? {};
  const thresholds: BudgetStatusThresholds = {
    watch: (raw.budget70 ?? 70) / 100,
    warning: (raw.budget80 ?? 80) / 100,
    critical: (raw.budget90 ?? 90) / 100,
  };

  return categories.map((cat) => {
    const spent = cat.transactions.reduce((sum, t) => sum + t.amount, 0);
    const budget = cat.budget ?? 0;
    const remaining = budget - spent;
    const percentage = calculateCategoryPercentage(spent, budget);
    const status = calculateBudgetStatus(spent, budget, thresholds);
    return {
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budget: cat.budget,
      spent,
      remaining,
      percentage,
      status,
    };
  });
}

/**
 * Daily spending series for a month, aligned to calendar days of a given month.
 * Optionally includes a `target` for the expected linear pace.
 */
export async function getDailySpending(
  userId: string,
  year: number,
  month: number, // 0-indexed
  opts: { withTarget?: boolean; budget?: number } = {},
): Promise<DailySpendingPoint[]> {
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const lastDay = new Date(year, month, totalDays, 23, 59, 59);

  const txns = await db.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: firstDay, lte: lastDay },
    },
    select: { amount: true, date: true },
  });

  const byDay: Record<number, number> = {};
  for (const t of txns) {
    const day = t.date.getDate();
    byDay[day] = (byDay[day] ?? 0) + t.amount;
  }

  const budget = opts.budget ?? 0;
  const points: DailySpendingPoint[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const amount = byDay[d] ?? 0;
    points.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      label: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month]} ${d}`,
      amount: Math.round(amount * 100) / 100,
      ...(opts.withTarget && budget > 0
        ? { target: Math.round(((budget / totalDays) * d) * 100) / 100 }
        : {}),
    });
  }
  return points;
}

/** Heatmap intensity for a range of days. 0 = none, 1-3 increasing. */
export async function getHeatmap(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<HeatmapDay[]> {
  const txns = await db.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: startDate, lte: endDate },
    },
    select: { amount: true, date: true },
  });

  const byDate = new Map<string, number>();
  for (const t of txns) {
    const key = t.date.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + t.amount);
  }

  const amounts = [...byDate.values()];
  const max = amounts.length ? Math.max(...amounts) : 1;

  const result: HeatmapDay[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const amount = byDate.get(key) ?? 0;
    let intensity: 0 | 1 | 2 | 3 = 0;
    if (amount > 0) {
      const r = amount / max;
      intensity = r > 0.66 ? 3 : r > 0.33 ? 2 : 1;
    }
    result.push({ date: key, amount, intensity });
  }
  return result;
}

/** Recent transactions for a user (with category), newest first. */
export async function getRecentTransactions(userId: string, limit = 8) {
  return db.transaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: "desc" },
    take: limit,
  });
}

/** Last N months of spending totals (actual, index 0 = oldest). */
export async function getMonthlyHistory(userId: string, months = 12) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await db.transaction.groupBy({
    by: ["date"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start },
    },
    _sum: { amount: true },
  });

  const perDate = new Map<number, number>();
  for (const r of rows) {
    const key = monthKey(r.date);
    perDate.set(key, (perDate.get(key) ?? 0) + (r._sum.amount ?? 0));
  }

  const result: { key: string; month: string; amount: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = d.getFullYear() * 12 + d.getMonth();
    result.push({
      key: String(key),
      month: formatMonthShort(d),
      amount: perDate.get(key) ?? 0,
    });
  }
  return result;
}

function monthKey(date: Date | string) {
  const d = new Date(date);
  return d.getFullYear() * 12 + d.getMonth();
}

function formatMonthShort(d: Date) {
  return d.toLocaleString("en-US", { month: "short" });
}

/** Date helpers re-exported for convenience. */
export { elapsedDaysInMonth, totalDaysInMonth, daysRemainingInMonth };
