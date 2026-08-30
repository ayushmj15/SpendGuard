"use client";

import type { BudgetSummary } from "@/types";
import { calculateRemainingBudget } from "@/utils/calculations";
import { formatINR } from "@/utils/currency";
import { BudgetBar, budgetStatusClass } from "@/components/ui/status";
import { Sparkles } from "lucide-react";

export function BudgetCard({ summary }: { summary: BudgetSummary }) {
  const meta = budgetStatusClass(summary.status);
  const overshot = summary.spent > summary.budget && summary.budget > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -right-4 h-32 w-32 rounded-full bg-white/10" />

      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
            Monthly Budget
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
            {meta.label}
          </span>
        </div>

        <div>
          <div className="text-4xl font-bold tracking-tight">
            {summary.budget > 0 ? formatINR(summary.budget) : "No budget set"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-wide text-primary-foreground/70">Spent</div>
            <div className="text-xl font-bold">{formatINR(summary.spent)}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-wide text-primary-foreground/70">Remaining</div>
            <div className="text-xl font-bold">
              {overshot ? (
                <span className="text-red-100">{formatINR(summary.remaining)}</span>
              ) : (
                formatINR(summary.remaining)
              )}
            </div>
          </div>
        </div>

        <BudgetBar
          value={summary.percentage}
          status={summary.status}
          className="bg-white/20"
        />
        <div className="flex items-center justify-between text-xs text-primary-foreground/80">
          <span>{summary.percentage.toFixed(1)}% used</span>
          <span>{formatINR(summary.budget - summary.spent)} left</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0" />
          <p className="text-sm">
            Your safe daily spending limit:{" "}
            <span className="font-bold">{formatINR(summary.dailySafeSpend)}/day</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RemainingCard({ summary }: { summary: BudgetSummary }) {
  const remaining = calculateRemainingBudget(summary.spent, summary.budget);
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">Remaining this month</p>
      <p className="mt-2 text-3xl font-bold">{formatINR(Math.max(0, remaining))}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {summary.daysRemaining} days left · {formatINR(summary.dailySafeSpend)}/day safe
      </p>
    </div>
  );
}
