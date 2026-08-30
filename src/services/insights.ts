import { db } from "@/lib/db";
import { getMonthlyHistory } from "@/services/spending";
import { formatINR } from "@/utils/currency";

export interface InsightCategory {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  lastMonth: number;
  changePct: number | null; // % change vs last month (null if lastMonth was 0/none)
  sharePct: number;
}

export interface BiggestExpense {
  id: string;
  amount: number;
  description: string | null;
  date: Date;
  categoryName: string | null;
  categoryColor: string | null;
}

export interface InsightSummary {
  monthSpent: number;
  lastMonthSpent: number;
  changePct: number | null;
  dailyAvg: number;
  lastDailyAvg: number;
  topCategory: InsightCategory | null;
  biggestExpense: BiggestExpense | null;
  busiestDay: { date: string; label: string; amount: number } | null;
  weekdayTotals: { day: string; amount: number }[];
  categories: InsightCategory[];
  monthlyHistory: { month: string; amount: number }[];
  totalTransactions: number;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function monthRange(year: number, month: number) {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0, 23, 59, 59),
  };
}

export async function getInsights(userId: string): Promise<InsightSummary> {
  const now = new Date();
  const cur = monthRange(now.getFullYear(), now.getMonth());
  const prev = monthRange(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    (now.getMonth() + 11) % 12,
  );

  const [curTxns, prevTxns, count] = await Promise.all([
    db.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: cur.start, lte: cur.end } },
      include: { category: true },
      orderBy: { date: "asc" },
    }),
    db.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: prev.start, lte: prev.end } },
      include: { category: true },
    }),
    db.transaction.count({
      where: { userId, type: "EXPENSE", date: { gte: cur.start, lte: cur.end } },
    }),
  ]);

  const monthSpent = curTxns.reduce((s, t) => s + t.amount, 0);
  const lastMonthSpent = prevTxns.reduce((s, t) => s + t.amount, 0);

  // Category aggregation for current + previous
  const curByCat = new Map<string, number>();
  for (const t of curTxns) {
    curByCat.set(t.categoryId, (curByCat.get(t.categoryId) ?? 0) + t.amount);
  }
  const prevByCat = new Map<string, number>();
  for (const t of prevTxns) {
    prevByCat.set(t.categoryId, (prevByCat.get(t.categoryId) ?? 0) + t.amount);
  }

  const categories: InsightCategory[] = [];
  const catInfo = new Map<string, { name: string; icon: string; color: string }>();
  for (const t of curTxns) {
    if (t.category && !catInfo.has(t.categoryId)) {
      catInfo.set(t.categoryId, { name: t.category.name, icon: t.category.icon, color: t.category.color });
    }
  }
  for (const [id, spent] of curByCat) {
    const info = catInfo.get(id) ?? { name: "Other", icon: "tag", color: "#94a3b8" };
    const lastMonth = prevByCat.get(id) ?? 0;
    const changePct =
      lastMonth > 0 ? ((spent - lastMonth) / lastMonth) * 100 : spent > 0 ? 100 : null;
    categories.push({
      categoryId: id,
      name: info.name,
      icon: info.icon,
      color: info.color,
      spent,
      lastMonth,
      changePct,
      sharePct: monthSpent > 0 ? (spent / monthSpent) * 100 : 0,
    });
  }
  categories.sort((a, b) => b.spent - a.spent);

  const topCategory = categories[0] ?? null;

  // Daily totals (current month) for busiest day + weekday pattern
  const byDay = new Map<string, number>(); // date -> amount
  const byWeekday = new Map<number, number>(); // day index -> amount
  for (const t of curTxns) {
    const iso = new Date(t.date).toISOString().slice(0, 10);
    byDay.set(iso, (byDay.get(iso) ?? 0) + t.amount);
    byWeekday.set(new Date(t.date).getDay(), (byWeekday.get(new Date(t.date).getDay()) ?? 0) + t.amount);
  }
  let busiestDay: InsightSummary["busiestDay"] = null;
  let busiestAmt = -1;
  for (const [date, amount] of byDay) {
    if (amount > busiestAmt) {
      busiestAmt = amount;
      const d = new Date(date + "T00:00:00");
      busiestDay = {
        date,
        label: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}`,
        amount,
      };
    }
  }
  const weekdayTotals = DAY_NAMES.map((day, idx) => ({
    day: day.slice(0, 3),
    amount: byWeekday.get(idx) ?? 0,
  }));

  // Biggest single expense this month
  let biggestExpense: BiggestExpense | null = null;
  let biggestAmt = -1;
  for (const t of curTxns) {
    if (t.amount > biggestAmt) {
      biggestAmt = t.amount;
      biggestExpense = {
        id: t.id,
        amount: t.amount,
        description: t.description,
        date: t.date,
        categoryName: t.category?.name ?? null,
        categoryColor: t.category?.color ?? null,
      };
    }
  }

  const el = now.getDate();
  const dailyAvg = el > 0 ? monthSpent / el : 0;
  const lastEl = new Date(prev.start.getFullYear(), prev.start.getMonth() + 1, 0).getDate();
  const lastDailyAvg = lastEl > 0 ? lastMonthSpent / lastEl : 0;

  const monthlyHistory = (await getMonthlyHistory(userId, 12)).map((m) => ({
    month: m.month,
    amount: m.amount,
  }));

  const changePct = lastMonthSpent > 0 ? ((monthSpent - lastMonthSpent) / lastMonthSpent) * 100 : null;

  return {
    monthSpent,
    lastMonthSpent,
    changePct,
    dailyAvg,
    lastDailyAvg,
    topCategory,
    biggestExpense,
    busiestDay,
    weekdayTotals,
    categories,
    monthlyHistory,
    totalTransactions: count,
  };
}

export { formatINR };
