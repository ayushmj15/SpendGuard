"use client";

import { HeatmapDay } from "@/types";
import { formatINR } from "@/utils/currency";

const LEVEL_BG: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-muted",
  1: "bg-primary/30",
  2: "bg-primary/60",
  3: "bg-primary",
};

export function Heatmap({ data, weeks = 12 }: { data: HeatmapDay[]; weeks?: number }) {
  const today = new Date();
  const map = new Map(data.map((d) => [d.date, d]));

  // Build week columns (Sunday start), ending today
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOffset = (end.getDay() + 1) % 7; // days after start of current week (Sun=0)
  const start = new Date(end);
  start.setDate(end.getDate() - ((weeks - 1) * 7 + endOffset));

  const columns: HeatmapDay[][] = [];
  let cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const entry = map.get(iso);
      week.push(entry ?? { date: iso, amount: 0, intensity: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
  }

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div>
      <div className="grid grid-flow-col gap-[3px] overflow-x-auto pb-1">
        {columns.map((week, wi) => (
          <div key={wi} className="grid grid-rows-7 gap-[3px]">
            {week.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.amount > 0 ? formatINR(d.amount) : "no spend"}`}
                className={`h-3 w-3 rounded-[3px] ${LEVEL_BG[d.intensity]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className={`h-3 w-3 rounded-[3px] ${LEVEL_BG[l as 0 | 1 | 2 | 3]}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
