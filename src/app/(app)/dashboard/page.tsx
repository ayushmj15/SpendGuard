import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  getBudgetSummary,
  getCategoryTotals,
  getDailySpending,
  getRecentTransactions,
  getMonthlyHistory,
  getHeatmap,
} from "@/services/spending";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard",
};

function greeting(name?: string | null) {
  const hour = new Date().getHours();
  let g = "Good evening";
  if (hour < 12) g = "Good morning";
  else if (hour < 17) g = "Good afternoon";
  return name ? `${g}, ${name.split(" ")[0]} 👋` : `${g} 👋`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const [categoryTotals, summary, recentTransactions, dailySpending, monthlyHistory, monthIncome, heatmap, user] =
    await Promise.all([
      getCategoryTotals(userId, monthStart, monthEnd),
      getBudgetSummary(userId),
      getRecentTransactions(userId, 8),
      getDailySpending(userId, today.getFullYear(), today.getMonth()),
      getMonthlyHistory(userId, 12),
      db.transaction.aggregate({
        where: {
          userId,
          type: "INCOME",
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      (() => {
        const hs = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13 * 7);
        return getHeatmap(userId, hs, monthEnd);
      })(),
      db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
    ]);

  const totalSpent = categoryTotals.reduce((s, c) => s + c.spent, 0);

  // no-spend days & streak
  const todayISO = today.toISOString().slice(0, 10);
  const noSpendDays = dailySpending.filter(
    (d) => d.amount === 0 && d.date <= todayISO,
  ).length;

  // saving streak: consecutive days up to today under the daily safe spend
  let streak = 0;
  for (let i = dailySpending.length - 1; i >= 0; i--) {
    const d = dailySpending[i];
    if (d.date > todayISO) continue;
    if (d.amount === 0 || (summary.dailySafeSpend > 0 && d.amount <= summary.dailySafeSpend)) {
      streak += 1;
    } else {
      break;
    }
  }

  const savingRate =
    monthIncome._sum.amount && monthIncome._sum.amount > 0
      ? ((monthIncome._sum.amount - totalSpent) / monthIncome._sum.amount) * 100
      : null;

  return (
    <DashboardClient
      greeting={greeting(user?.name)}
      summary={summary}
      totalSpent={totalSpent}
      monthIncome={monthIncome._sum.amount ?? 0}
      savingRate={savingRate}
      categoryTotals={categoryTotals}
      recentTransactions={recentTransactions}
      dailySpending={dailySpending}
      monthlyHistory={monthlyHistory}
      heatmap={heatmap}
      noSpendDays={noSpendDays}
      streak={streak}
    />
  );
}
