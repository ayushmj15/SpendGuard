"use client";

import type { BudgetSummary } from "@/types";
import { formatINR } from "@/utils/currency";
import { TrendingUp, CircleAlert, CheckCircle2 } from "lucide-react";

export function ForecastCard({ summary }: { summary: BudgetSummary }) {
  const under = summary.projectedOverrun <= 0;
  if (summary.budget <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <h3 className="font-semibold">End-of-Month Forecast</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Set a monthly budget to see where you&apos;re headed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <TrendingUp className="h-4 w-4" />
        <h3 className="font-semibold">End-of-Month Forecast</h3>
      </div>

      <div className="mt-3 text-3xl font-bold">
        {formatINR(summary.projected)}
      </div>
      <p className="text-sm text-muted-foreground">projected by end of month</p>

      <div
        className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-3 text-sm ${
          under
            ? "bg-success/10 text-success"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        {under ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p>
          {under
            ? `You're on track to stay ${formatINR(Math.abs(summary.projectedOverrun))} under budget.`
            : `At your current pace you're likely to exceed your budget by ${formatINR(summary.projectedOverrun)}.`}
        </p>
      </div>
    </div>
  );
}
