import { db } from "@/lib/db";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_BUDGETS,
  DEFAULT_WARNING_THRESHOLDS,
  categoryIconKey,
} from "@/lib/constants";

/**
 * Seeds everything a fresh user needs: default categories (with default budgets),
 * default settings, and the initial monthly budget.
 */
export async function initializeUser(userId: string) {
  for (const cat of DEFAULT_CATEGORIES) {
    await db.category.create({
      data: {
        userId,
        name: cat.name,
        icon: categoryIconKey(cat.name),
        color: cat.color,
        budget: DEFAULT_CATEGORY_BUDGETS[cat.name] ?? null,
        isDefault: true,
      },
    });
  }

  const now = new Date();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  await db.userSettings.create({
    data: {
      userId,
      warningThresholds: DEFAULT_WARNING_THRESHOLDS,
      dashboardCards: [
        "budget",
        "forecast",
        "spending",
        "categories",
        "recent",
      ],
    },
  });

  await db.budget.create({
    data: {
      userId,
      name: "Monthly Budget",
      amount: 10000,
      periodType: "MONTHLY",
      rolloverEnabled: false,
      budgetPeriods: {
        create: {
          userId,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), totalDays, 23, 59, 59),
          amount: 10000,
        },
      },
    },
  });
}

/**
 * Idempotently provisions defaults for a user (safe for OAuth sign-ins, where we
 * can't be sure provisioning ran). No-op once the user has settings.
 */
export async function ensureUserInitialized(userId: string) {
  const settings = await db.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    await initializeUser(userId);
  }
}
