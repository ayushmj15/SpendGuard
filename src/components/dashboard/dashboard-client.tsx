"use client";

import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import type { BudgetSummary, CategoryTotals, DailySpendingPoint, HeatmapDay } from "@/types";
import { StatCards } from "./stat-cards";
import { BudgetCard } from "./budget-card";
import { ForecastCard } from "./forecast-card";
import { SpendingVelocity } from "./velocity";
import { CanISpend } from "./can-i-spend";
import { DailySpendingChart } from "./daily-spending-chart";
import { MonthlyGraph } from "./monthly-graph";
import { CategoryDonut } from "./category-donut";
import { Heatmap } from "./heatmap";
import { RecentTransactions } from "./recent-transactions";
import { SpendLockCard } from "@/components/spend-lock/spend-lock-card";

type RecentTxn = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  note: string | null;
  date: Date;
  paymentMethod: string;
  category: { name: string; color: string; icon: string } | null;
};

export function DashboardClient({
  greeting,
  summary,
  totalSpent,
  monthIncome,
  savingRate,
  categoryTotals,
  recentTransactions,
  dailySpending,
  monthlyHistory,
  heatmap,
  noSpendDays,
  streak,
}: {
  greeting: string;
  summary: BudgetSummary;
  totalSpent: number;
  monthIncome: number;
  savingRate: number | null;
  categoryTotals: CategoryTotals[];
  recentTransactions: RecentTxn[];
  dailySpending: DailySpendingPoint[];
  monthlyHistory: { key: string; month: string; amount: number }[];
  heatmap: HeatmapDay[];
  noSpendDays: number;
  streak: number;
}) {
  const donutData = categoryTotals
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6)
    .map((c) => ({ name: c.name, value: c.spent, color: c.color }));

  const topCategory = categoryTotals.length
    ? categoryTotals.reduce((a, b) => (b.spent > a.spent ? b : a), categoryTotals[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s your money at a glance.
          </p>
        </div>
        {streak > 1 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-sm font-medium text-warning">
            <Award className="h-4 w-4" />
            {streak}-day streak
          </span>
        )}
      </div>

      {/* Stat cards */}
      <StatCards
        totalSpent={totalSpent}
        monthIncome={monthIncome}
        noSpendDays={noSpendDays}
        savingRate={savingRate}
      />

      {/* Top row: budget + forecast + can-i-spend */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BudgetCard summary={summary} />
        <ForecastCard summary={summary} />
        <CanISpend summary={summary} />
      </div>

      {/* Spending velocity */}
      <SpendingVelocity summary={summary} />

      {/* Spending lock */}
      <SpendLockCard />

      {/* Daily spending chart */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Daily Spending</h2>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleString("en-US", { month: "long" })} {new Date().getFullYear()}
          </span>
        </div>
        <DailySpendingChart
          data={dailySpending}
          budget={summary.budget}
        />
      </section>

      {/* Monthly history graph */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Spending History</h2>
        </div>
        <MonthlyGraph data={monthlyHistory} />
      </section>

      {/* Categories + heatmap */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Top Categories</h2>
            {topCategory && topCategory.spent > 0 && (
              <span className="text-xs text-muted-foreground">
                Most spent on <span className="font-medium text-foreground">{topCategory.name}</span>
              </span>
            )}
          </div>
          <CategoryDonut data={donutData} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Spending Heatmap</h2>
          <Heatmap data={heatmap} />
        </section>
      </div>

      {/* Recent transactions */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent Transactions</h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <RecentTransactions transactions={recentTransactions} />
      </section>
    </div>
  );
}
