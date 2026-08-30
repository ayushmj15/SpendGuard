"use client";

import type { BudgetSummary } from "@/types";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const VELOCITY_META: Record<
  "HEALTHY" | "MODERATE" | "FAST" | "VERY_FAST",
  { label: string; color: string; bar: string }
> = {
  HEALTHY: { label: "Healthy", color: "text-success", bar: "bg-success" },
  MODERATE: { label: "Moderate", color: "text-primary", bar: "bg-primary" },
  FAST: { label: "Fast", color: "text-warning", bar: "bg-warning" },
  VERY_FAST: { label: "Very fast", color: "text-destructive", bar: "bg-destructive" },
};

export function SpendingVelocity({ summary }: { summary: BudgetSummary }) {
  const meta = VELOCITY_META[summary.velocityStatus];
  const pct = summary.velocityPct;

  let message: string;
  if (pct == null) {
    message = "Not enough data to measure your pace yet.";
  } else if (pct > 0) {
    message = `You're spending ${Math.round(pct)}% faster than your target pace.`;
  } else {
    message = `You're spending ${Math.round(Math.abs(pct))}% slower than your target pace. Nice.`;
  }

  // Map velocity into 0-100 for the gauge (0 = healthy/slow, 100 = very fast)
  const gauge = pct == null ? 0 : Math.min(100, Math.max(0, pct * 1.2));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Gauge className="h-4 w-4" />
        <h3 className="font-semibold">Spending Velocity</h3>
        <span className={cn("ml-auto text-xs font-semibold", meta.color)}>
          {meta.label}
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full progress-transition", meta.bar)}
          style={{ width: `${gauge}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
