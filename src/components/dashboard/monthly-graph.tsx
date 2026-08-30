"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatINR } from "@/utils/currency";

export function MonthlyGraph({
  data,
}: {
  data: { key: string; month: string; amount: number }[];
}) {
  if (!data || data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            formatter={(value: any) => formatINR(Number(value))}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="amount" name="Spent" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} maxBarSize={28} />
          <Line
            type="monotone"
            dataKey="amount"
            name="Trend"
            stroke="hsl(var(--warning))"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
