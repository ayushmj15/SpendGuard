"use client";

import { Wallet, PiggyBank, CalendarOff, Flame } from "lucide-react";
import { formatINR } from "@/utils/currency";
import { cn } from "@/lib/utils";

type Stat = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone: "default" | "success" | "warning";
};

export function StatCards({
  totalSpent,
  monthIncome,
  noSpendDays,
  savingRate,
}: {
  totalSpent: number;
  monthIncome: number;
  noSpendDays: number;
  savingRate: number | null;
}) {
  const stats: Stat[] = [
    {
      label: "Spent this month",
      value: formatINR(totalSpent),
      icon: <Wallet className="h-4 w-4" />,
      tone: "default",
    },
    {
      label: "Income this month",
      value: formatINR(monthIncome),
      icon: <PiggyBank className="h-4 w-4" />,
      tone: "success",
    },
    {
      label: "No-spend days",
      value: String(noSpendDays),
      sub: "this month",
      icon: <CalendarOff className="h-4 w-4" />,
      tone: "warning",
    },
    {
      label: "Saving rate",
      value: savingRate == null ? "—" : `${savingRate.toFixed(0)}%`,
      sub: savingRate == null ? "log income to see" : "of income saved",
      icon: <Flame className="h-4 w-4" />,
      tone: "success",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              s.tone === "success"
                ? "bg-success/15 text-success"
                : s.tone === "warning"
                  ? "bg-warning/15 text-warning"
                  : "bg-primary/15 text-primary",
            )}
          >
            {s.icon}
          </div>
          <p className="mt-3 text-xl font-bold">{s.value}</p>
          <p className="text-xs text-muted-foreground">
            {s.label}
            {s.sub ? ` · ${s.sub}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
