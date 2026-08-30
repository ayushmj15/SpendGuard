"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Download, FileText, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { getReportAction } from "@/actions/query";
import type { ReportData } from "@/services/report";
import { formatINR } from "@/utils/currency";
import { resolveCategoryIcon } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function exportToFile(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(rows: string[][]) {
  return rows
    .map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const up = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-destructive" : "text-success")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(Math.round(value))}% vs prev. period
    </span>
  );
}

export function ReportsClient({ defaults }: { defaults: { from: string; to: string; hasCategories: boolean } }) {
  const [from, setFrom] = React.useState(defaults.from);
  const [to, setTo] = React.useState(defaults.to);
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async (f: string, t: string) => {
    try {
      const d = await getReportAction(f || undefined, t || undefined);
      setData(d as unknown as ReportData);
    } catch {
      toast.error("Couldn't load report");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run() {
    setLoading(true);
    load(from, to);
  }

  function downloadCsv() {
    if (!data) return;
    const rows: string[][] = [
      ["SpendGuard Transaction Report"],
      ["From", data.from],
      ["To", data.to],
      ["Total Expenses (INR)", data.totalExpense.toFixed(2)],
      ["Total Income (INR)", data.totalIncome.toFixed(2)],
      ["Net (INR)", data.net.toFixed(2)],
      ["Transaction Count", String(data.totalCount)],
      [],
      ["Category", "Amount (INR)", "Count", "Previous Period (INR)", "Change %", "Share %"],
      ...data.categories.map((c) => [
        c.name,
        c.amount.toFixed(2),
        String(c.count),
        c.previous.toFixed(2),
        c.changePct == null ? "" : c.changePct.toFixed(1),
        c.sharePct.toFixed(1),
      ]),
      [],
      ["Date", "Label", "Net (INR)", "Expense (INR)", "Income (INR)"],
      ...data.days.map((d) => [d.date, d.label, d.amount.toFixed(2), d.expense.toFixed(2), d.income.toFixed(2)]),
    ];
    exportToFile(`spendguard-report-${data.from}-to-${data.to}.csv`, "text/csv", toCsv(rows));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Analyze and export your spending over any period.</p>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <Button onClick={run} disabled={loading} className="mb-0.5">
            {loading ? "Loading…" : "Run Report"}
          </Button>
          <div className="ml-auto flex gap-2 mb-0.5">
            <Button variant="outline" onClick={downloadCsv} disabled={!data}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" asChild disabled={!data}>
              <a href="/api/export?format=json" download>
                <FileText className="h-4 w-4" /> JSON
              </a>
            </Button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Computing report…
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Expenses" value={formatINR(data.totalExpense)} sub={<ChangeBadge value={data.changePct} />} tone="expense" />
            <SummaryCard label="Income" value={formatINR(data.totalIncome)} tone="income" />
            <SummaryCard label="Net" value={formatINR(data.net)} tone={data.net >= 0 ? "income" : "expense"} />
            <SummaryCard label="Transactions" value={String(data.totalCount)} sub="in this period" />
          </div>

          {/* Daily trend */}
          {data.days.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="mb-1 font-semibold">Daily Net Flow</h2>
              <p className="mb-4 text-xs text-muted-foreground">{data.from} → {data.to}</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} minTickGap={16} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      formatter={(value: unknown) => formatINR(Number(value))}
                    />
                    <Bar dataKey="amount" name="Net" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Category breakdown */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Category Breakdown</h2>
            {data.categories.length > 0 ? (
              <ul className="space-y-3">
                {data.categories.map((c) => {
                  const Icon = resolveCategoryIcon(c.icon);
                  return (
                    <li key={c.categoryId} className="flex items-center gap-3 text-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${c.color}22` }}>
                        <Icon className="h-4 w-4" style={{ color: c.color }} />
                      </span>
                      <span className="w-36 truncate font-medium">{c.name}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ background: c.color, width: `${Math.min(100, c.sharePct)}%` }} />
                      </div>
                      <span className="w-24 text-right font-semibold">{formatINR(c.amount)}</span>
                      <span className="w-16 text-right text-xs text-muted-foreground">
                        <ChangeBadge value={c.changePct} />
                      </span>
                      <span className="w-12 text-right text-xs text-muted-foreground">{c.count}×</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No expenses in this period.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "expense" | "income";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold", tone === "expense" && "text-destructive", tone === "income" && "text-success")}>
        {value}
      </p>
      {sub && <div className="mt-1 text-xs">{sub}</div>}
    </div>
  );
}
