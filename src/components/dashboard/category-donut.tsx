"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatINR } from "@/utils/currency";

type Slice = { name: string; value: number; color: string };

export function CategoryDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => [formatINR(Number(value)), name]}
              contentStyle={{ borderRadius: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Spent</span>
          <span className="text-lg font-bold">{formatINR(total)}</span>
        </div>
      </div>

      {data.length > 0 ? (
        <ul className="w-full space-y-2 sm:flex-1">
          {data.map((d, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="flex-1 truncate">{d.name}</span>
              <span className="font-medium">{(total > 0 ? (d.value / total) * 100 : 0).toFixed(0)}%</span>
              <span className="w-20 text-right text-muted-foreground">{formatINR(d.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No category spend this month yet.</p>
      )}
    </div>
  );
}
