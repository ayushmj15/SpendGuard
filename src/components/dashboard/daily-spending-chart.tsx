"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { formatINR } from "@/utils/currency";
import { weekdayShort } from "@/utils/date";
import { todayISO } from "@/utils/date";

type Point = {
  date: string;
  label: string;
  amount: number;
  target: number;
  isToday: boolean;
};

export function DailySpendingChart({
  data,
  budget,
}: {
  data: { date: string; label: string; amount: number }[];
  budget: number;
}) {
  if (!data || data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No spending recorded yet this month.</p>;
  }

  const totalDays = data.length;
  const now = todayISO();
  const points: Point[] = data.map((d, i) => ({
    ...d,
    target: budget > 0 ? Math.round(((budget / totalDays) * (i + 1)) * 100) / 100 : 0,
    isToday: d.date === now,
  }));

  const max = Math.max(...points.map((p) => Math.max(p.amount, p.target)), 1);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => weekdayShort(v)}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            domain={[0, max * 1.15]}
          />
          <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} content={<DailyTooltip />} />
          <ReferenceLine stroke="hsl(var(--muted-foreground) / 0.6)" strokeDasharray="4 4" />
          <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Spent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DailyTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: Point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">
        {p.label}
        {p.isToday ? " · Today" : ""}
      </p>
      <p className="text-primary">Spent: {formatINR(p.amount)}</p>
      {p.target > 0 && <p className="text-muted-foreground">Target: {formatINR(p.target)}</p>}
    </div>
  );
}
