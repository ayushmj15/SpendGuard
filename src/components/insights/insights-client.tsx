"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Receipt, Flame, Crown } from "lucide-react";
import type { InsightSummary } from "@/services/insights";
import { formatINR } from "@/utils/currency";
import { resolveCategoryIcon } from "@/lib/constants";
import { cn } from "@/lib/utils";

function ChangeBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const up = value > 0;
  const icon = up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-destructive" : "text-success",
      )}
    >
      {icon} {Math.abs(Math.round(value))}%
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function InsightsClient({ insights }: { insights: InsightSummary }) {
  const catData = insights.categories.slice(0, 8).map((c) => ({
    name: c.name,
    amount: c.spent,
    color: c.color,
  }));
  const weekdayData = insights.weekdayTotals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">Understand your spending patterns.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Spent this month"
          value={formatINR(insights.monthSpent)}
          icon={Receipt}
          sub={
            insights.changePct != null ? (
              <span>
                <ChangeBadge value={insights.changePct} /> vs last month
              </span>
            ) : (
              <span>No prior-month spending</span>
            )
          }
        />
        <StatCard
          label="Daily average"
          value={formatINR(insights.dailyAvg)}
          icon={TrendingDown}
          sub={
            insights.lastDailyAvg > 0 ? (
              <span className="flex items-center gap-1">
                <ChangeBadge
                  value={
                    ((insights.dailyAvg - insights.lastDailyAvg) / insights.lastDailyAvg) * 100
                  }
                />
                vs last month
              </span>
            ) : (
              <span>this month</span>
            )
          }
        />
        <StatCard
          label="Busiest day"
          value={insights.busiestDay?.label ?? "—"}
          icon={Flame}
          sub={
            insights.busiestDay ? `Spent ${formatINR(insights.busiestDay.amount)}` : "No spending yet"
          }
        />
        <StatCard
          label="Transactions"
          value={String(insights.totalTransactions)}
          icon={Receipt}
          sub="this month"
        />
      </div>

      {/* Top category + biggest expense highlights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Crown className="h-4 w-4 text-warning" />
            <h2 className="font-semibold">Top Spending Category</h2>
          </div>
          {insights.topCategory ? (
            <div className="mt-3 flex items-center gap-3">
              {(() => {
                const Icon = resolveCategoryIcon(insights.topCategory.icon);
                return (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${insights.topCategory.color}22` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: insights.topCategory.color }} />
                  </div>
                );
              })()}
              <div>
                <p className="text-lg font-bold">{insights.topCategory.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatINR(insights.topCategory.spent)} ·{" "}
                  {insights.topCategory.sharePct.toFixed(0)}% of spending
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No category spending this month.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <h2 className="font-semibold">Biggest Expense</h2>
          </div>
          {insights.biggestExpense ? (
            <div className="mt-3">
              <p className="text-lg font-bold text-destructive">
                {formatINR(insights.biggestExpense.amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {insights.biggestExpense.description ||
                  insights.biggestExpense.categoryName ||
                  "Expense"}
                {insights.biggestExpense.categoryName
                  ? ` · ${insights.biggestExpense.categoryName}`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No expenses this month yet.</p>
          )}
        </div>
      </div>

      {/* Monthly history */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Spending Trend</h2>
        <p className="mb-4 text-xs text-muted-foreground">Last 12 months</p>
        {insights.monthlyHistory.length > 0 ? (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.monthlyHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                  formatter={(value: unknown) => formatINR(Number(value))}
                />
                <Bar dataKey="amount" name="Spent" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
        )}
      </section>

      {/* Weekday pattern + categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 font-semibold">Spending by Day of Week</h2>
          <p className="mb-4 text-xs text-muted-foreground">Where your money goes by weekday</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  formatter={(value: unknown) => formatINR(Number(value))}
                />
                <Bar dataKey="amount" name="Spent" fill="hsl(var(--warning))" radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Category Breakdown</h2>
            <span className="text-xs text-muted-foreground">this month</span>
          </div>
          {catData.length > 0 ? (
            <ul className="space-y-3">
              {catData.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="w-28 truncate font-medium">{c.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: c.color,
                        width: `${Math.min(100, (c.amount / Math.max(insights.monthSpent, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-20 text-right text-muted-foreground">{formatINR(c.amount)}</span>
                  <span className="w-10 text-right text-xs text-muted-foreground">
                    {insights.monthSpent > 0 ? Math.round((c.amount / insights.monthSpent) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No category data yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
