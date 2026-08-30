import { db } from "@/lib/db";
import type { NotificationType } from "@/lib/constants";
import { formatINR } from "@/utils/currency";

interface BudgetAlertContext {
  spent: number;
  budget: number;
  thresholds: Record<string, number>;
  overshoot: number; // amount over budget (0 if under)
}

interface CategoryAlertContext {
  categoryName: string;
  spent: number;
  budget: number;
}

type ThresholdKey = "budget50" | "budget70" | "budget80" | "budget90" | "budget100";

const LARGE_EXPENSE_PERCENT = 0.2; // expense > 20% of remaining budget

/**
 * Evaluates budget progress and creates/cleans-up relevant notifications.
 * Only emits the most severe alert for a given milestone to avoid spam.
 */
export async function generateBudgetAlerts(
  userId: string,
  ctx: BudgetAlertContext,
): Promise<void> {
  if (ctx.budget <= 0) return;

  const pct = (ctx.spent / ctx.budget) * 100;
  const remaining = ctx.budget - ctx.spent;

  const milestones: { key: ThresholdKey; min: number; title: string; message: string; type: NotificationType }[] = [
    { key: "budget50", min: 50, title: "Halfway there", message: `You've used ${Math.round(pct)}% of your monthly budget.`, type: "BUDGET_WARNING" },
    { key: "budget70", min: 70, title: "Most of your budget used", message: `⚠️ You've used ${Math.round(pct)}% of your monthly budget.`, type: "BUDGET_WARNING" },
    { key: "budget80", min: 80, title: "Budget nearly exhausted", message: `⚠️ Careful! Only ${formatINR(Math.max(0, remaining))} remains from your monthly budget.`, type: "BUDGET_WARNING" },
    { key: "budget90", min: 90, title: "Almost at your limit", message: `🚨 You're very close to your monthly spending limit.`, type: "BUDGET_WARNING" },
    { key: "budget100", min: 100, title: "Budget exceeded", message: ctx.overshoot > 0 ? `🔴 You've exceeded your monthly budget by ${formatINR(ctx.overshoot)}.` : `🚨 Monthly budget exceeded.`, type: "BUDGET_EXCEEDED" },
  ];

  // Passed thresholds (percent value from settings)
  const passed = milestones.filter(
    (m) => pct >= (ctx.thresholds[m.key] ?? m.min),
  );

  // Find the most severe passed milestone not already notified today
  const target = passed[passed.length - 1];
  if (!target) return;

  const existing = await db.notification.findFirst({
    where: {
      userId,
      type: target.type,
      title: target.title,
      read: false,
    },
  });

  if (existing) return;

  await db.notification.create({
    data: {
      userId,
      type: target.type,
      title: target.title,
      message: target.message,
    },
  });
}

/**
 * Enforces the most severe budget-exceeded notification exists while removing
 * stale lower-level ones (e.g. after the user deletes expenses).
 */
export async function reconcileBudgetNotifications(
  userId: string,
  ctx: BudgetAlertContext,
): Promise<void> {
  const existing = await db.notification.findMany({
    where: { userId, type: { in: ["BUDGET_WARNING", "BUDGET_EXCEEDED"] }, read: false },
  });

  for (const n of existing) {
    if (n.type === "BUDGET_EXCEEDED" && ctx.overshoot <= 0) {
      // Budget no longer exceeded - clean up
      if (n.type === "BUDGET_EXCEEDED") {
        await db.notification.delete({ where: { id: n.id } });
      }
    } else if (n.type === "BUDGET_WARNING" && ctx.budget > 0) {
      const pct = (ctx.spent / ctx.budget) * 100;
      if (pct >= (ctx.thresholds.budget100 ?? 100)) {
        // Upgraded to exceeded - remove stale warning
        await db.notification.delete({ where: { id: n.id } });
      }
    }
  }

  await generateBudgetAlerts(userId, ctx);
}

/** Creates a category warning when a category reaches its configured budget. */
export async function generateCategoryAlert(
  userId: string,
  ctx: CategoryAlertContext,
): Promise<void> {
  if (!ctx.budget || ctx.budget <= 0) return;
  const pct = (ctx.spent / ctx.budget) * 100;

  if (pct >= 100) {
    const existing = await db.notification.findFirst({
      where: { userId, type: "CATEGORY_WARNING", title: `\u{1F534} ${ctx.categoryName} budget exceeded`, read: false },
    });
    if (!existing) {
      await db.notification.create({
        data: {
          userId,
          type: "CATEGORY_WARNING",
          title: `\u{1F534} ${ctx.categoryName} budget exceeded`,
          message: `You've exceeded your ${ctx.categoryName} budget by ${formatINR(ctx.spent - ctx.budget)}.`,
        },
      });
    }
  } else if (pct >= 90) {
    const existing = await db.notification.findFirst({
      where: { userId, type: "CATEGORY_WARNING", title: `\u{1F534} ${ctx.categoryName} budget almost exhausted`, read: false },
    });
    if (!existing) {
      await db.notification.create({
        data: {
          userId,
          type: "CATEGORY_WARNING",
          title: `\u{1F534} ${ctx.categoryName} budget almost exhausted`,
          message: `${ctx.categoryName} budget is ${Math.round(pct)}% used. Only ${formatINR(ctx.budget - ctx.spent)} left.`,
        },
      });
    }
  }
}

/** Creates a "large expense" notification (used by the cool-down flow). */
export async function createLargeExpenseAlert(
  userId: string,
  amount: number,
  remaining: number,
): Promise<void> {
  await db.notification.create({
    data: {
      userId,
      type: "LARGE_EXPENSE",
      title: "\u{1F4B0} Large expense recorded",
      message: `You logged ${formatINR(amount)}. That's ${formatINR(amount)} against ${formatINR(remaining)} remaining this month.`,
    },
  });
}

/** Creates a forecast warning when the projection exceeds the budget. */
export async function generateForecastWarning(
  userId: string,
  projected: number,
  budget: number,
  overrun: number,
): Promise<void> {
  if (budget > 0 && overrun > 0) {
    await db.notification.create({
      data: {
        userId,
        type: "FORECAST_WARNING",
        title: "End-of-month forecast",
        message: `At your current pace you're likely to exceed your budget by ${formatINR(overrun)}.`,
      },
    });
  } else if (budget > 0) {
    await db.notification.create({
      data: {
        userId,
        type: "FORECAST_WARNING",
        title: "On track",
        message: `You're projected to end the month ${overrun <= 0 ? "under" : "over"} budget.`,
      },
    });
  }
}

/** Utility: build the alert context for a user and current period. */
export async function buildBudgetAlertContext(
  userId: string,
): Promise<BudgetAlertContext | null> {
  const settings = await db.userSettings.findUnique({ where: { userId } });
  const today = new Date();

  const period = await db.budgetPeriod.findFirst({
    where: {
      userId,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    orderBy: { startDate: "desc" },
  });

  if (!period) return null;

  const agg = await db.transaction.aggregate({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: period.startDate, lte: period.endDate },
    },
    _sum: { amount: true },
  });

  const spent = agg._sum.amount ?? 0;
  const gap = spent - period.amount;
  return {
    spent,
    budget: period.amount,
    thresholds: (settings?.warningThresholds as Record<string, number>) ?? {},
    overshoot: gap > 0 ? gap : 0,
  };
}
