// Core financial calculations for SpendGuard.
// All functions are pure and defensive about edge cases:
//  - zero/negative budget
//  - no transactions
//  - first / last day of month
//  - invalid or negative inputs

export type BudgetStatus =
  | "HEALTHY"
  | "WATCH"
  | "WARNING"
  | "CRITICAL"
  | "EXCEEDED";

export type VelocityStatus = "HEALTHY" | "MODERATE" | "FAST" | "VERY_FAST";

export interface BudgetStatusThresholds {
  watch: number; // default 0.7
  warning: number; // default 0.8
  critical: number; // default 0.9
}

export const DEFAULT_BUDGET_THRESHOLDS: BudgetStatusThresholds = {
  watch: 0.7,
  warning: 0.8,
  critical: 0.9,
};

function sanitize(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/** Percentage of budget spent (0-100). Returns 0 when budget is 0. */
export function calculateBudgetPercentage(spent: number, budget: number): number {
  const safeSpent = sanitize(spent);
  const safeBudget = sanitize(budget);
  if (safeBudget <= 0) return 0;
  return (safeSpent / safeBudget) * 100;
}

/** Remaining budget. Negative means overspent. */
export function calculateRemainingBudget(spent: number, budget: number): number {
  return sanitize(budget) - sanitize(spent);
}

/**
 * How much the user can safely spend per day for the rest of the period.
 * remainingDays counts the remaining days including today.
 * If remainingDays <= 0 or remaining <= 0 returns 0.
 */
export function calculateDailySafeSpend(
  spent: number,
  budget: number,
  remainingDays: number,
): number {
  const remaining = calculateRemainingBudget(spent, budget);
  const safeDays = Math.max(0, Math.floor(remainingDays));
  if (remaining <= 0 || safeDays <= 0) return 0;
  return remaining / safeDays;
}

/**
 * Spending velocity: how much faster/slower actual spending is vs the expected
 * linear pace. Returns a percentage (e.g. 44 = 44% faster, -20 = 20% slower).
 * Handles elapsedDays = 0 (no time passed yet -> pace 0 -> null).
 */
export function calculateSpendingVelocity(
  spent: number,
  budget: number,
  elapsedDays: number,
  totalDays: number,
): number | null {
  const safeBudget = sanitize(budget);
  const safeElapsed = Math.max(0, Math.floor(elapsedDays));
  const safeTotal = Math.max(1, Math.floor(totalDays));
  if (safeBudget <= 0 || safeElapsed <= 0) return null;
  const expected = (safeBudget / safeTotal) * safeElapsed;
  if (expected <= 0) return null;
  return ((spent - expected) / expected) * 100;
}

/** Human-friendly velocity status based on overspend %. */
export function toVelocityStatus(velocityPct: number | null): VelocityStatus {
  if (velocityPct == null) return "HEALTHY";
  if (velocityPct <= 10) return "HEALTHY";
  if (velocityPct <= 35) return "MODERATE";
  if (velocityPct <= 70) return "FAST";
  return "VERY_FAST";
}

/**
 * Projected total spending for the period based on current average.
 * projected = (currentSpending / elapsedDays) * totalDaysInMonth
 * Handles elapsedDays = 0 by returning currentSpending.
 */
export function calculateProjectedSpending(
  currentSpending: number,
  elapsedDays: number,
  totalDaysInMonth: number,
): number {
  const safeElapsed = Math.max(0, Math.floor(elapsedDays));
  const safeTotal = Math.max(1, Math.floor(totalDaysInMonth));
  const safeSpent = sanitize(currentSpending);
  if (safeElapsed <= 0) return safeSpent;
  return (safeSpent / safeElapsed) * safeTotal;
}

/** Forecast overrun: predicted - budget. Negative means under budget. */
export function calculateProjectedOverrun(
  projected: number,
  budget: number,
): number {
  return projected - sanitize(budget);
}

/** Overall budget status based on thresholds. */
export function calculateBudgetStatus(
  spent: number,
  budget: number,
  thresholds: BudgetStatusThresholds = DEFAULT_BUDGET_THRESHOLDS,
): BudgetStatus {
  const safeBudget = sanitize(budget);
  const safeSpent = sanitize(spent);
  if (safeBudget <= 0) return "HEALTHY";
  const ratio = safeSpent / safeBudget;
  if (safeSpent > safeBudget) return "EXCEEDED";
  if (ratio >= thresholds.critical) return "CRITICAL";
  if (ratio >= thresholds.warning) return "WARNING";
  if (ratio >= thresholds.watch) return "WATCH";
  return "HEALTHY";
}

/** Category budget percentage used (0-100). 0 when category budget is 0/absent. */
export function calculateCategoryPercentage(
  categorySpent: number,
  categoryBudget: number,
): number {
  return calculateBudgetPercentage(categorySpent, categoryBudget);
}

/** Category status using the same threshold scale. */
export function calculateCategoryStatus(
  spent: number,
  budget: number,
  thresholds: BudgetStatusThresholds = DEFAULT_BUDGET_THRESHOLDS,
): BudgetStatus {
  return calculateBudgetStatus(spent, budget, thresholds);
}

/** Average daily spending across a number of days. Days <= 0 -> 0. */
export function calculateAverageDailySpending(
  totalSpent: number,
  daysCounted: number,
): number {
  const safeDays = Math.max(0, daysCounted);
  if (safeDays <= 0) return 0;
  return sanitize(totalSpent) / safeDays;
}

/** Number of full days elapsed so far today (1-based: day 1 of month -> 1). */
export function elapsedDaysInMonth(date: Date = new Date()): number {
  return date.getDate();
}

/** Total number of days in a given month. */
export function totalDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Days remaining in the current month (including today). */
export function daysRemainingInMonth(date: Date = new Date()): number {
  return totalDaysInMonth(date) - date.getDate() + 1;
}

/** Month-over-month percentage change. positive = spent more, negative = spent less. null if no base. */
export function calculateMonthComparison(
  currentSpending: number,
  previousSpending: number,
): number | null {
  const safePrevious = sanitize(previousSpending);
  if (safePrevious <= 0) return null;
  return ((sanitize(currentSpending) - safePrevious) / safePrevious) * 100;
}

/** How many "no-spend days" (days with 0 spending) in a set of daily totals. */
export function countNoSpendDays(dailySpending: Record<string, number>): number {
  return Object.values(dailySpending).filter((v) => sanitize(v) <= 0).length;
}

/** Whether an expense should raise a "cool down" prompt (> X% of remaining budget). */
export function shouldWarnCoolDown(
  expenseAmount: number,
  remainingBudget: number,
  threshold = 0.1,
): boolean {
  const safeRemaining = sanitize(remainingBudget);
  if (safeRemaining <= 0) return true;
  if (sanitize(expenseAmount) <= 0) return false;
  return expenseAmount / safeRemaining > threshold;
}
