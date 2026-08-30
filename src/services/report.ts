import { db } from "@/lib/db";

export interface ReportCategoryRow {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
  previous: number;
  changePct: number | null;
  sharePct: number;
}

export interface ReportDayRow {
  date: string;
  label: string;
  amount: number;
  expense: number;
  income: number;
}

export interface ReportData {
  from: string;
  to: string;
  totalExpense: number;
  totalIncome: number;
  totalCount: number;
  net: number;
  categories: ReportCategoryRow[];
  days: ReportDayRow[];
  previousTotalExpense: number;
  changePct: number | null;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mid(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
}

export function normalizeDateInput(from?: string, to?: string) {
  const today = new Date();
  const toDate = to ? new Date(to + "T23:59:59") : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  const fromDate = from ? new Date(from + "T00:00:00") : new Date(toDate.getFullYear(), toDate.getMonth(), 1, 0, 0, 0);
  return { fromDate, toDate };
}

export async function getReport(userId: string, from?: string, to?: string): Promise<ReportData> {
  const { fromDate, toDate } = normalizeDateInput(from, to);

  const range = (start: Date, end: Date) =>
    db.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: "asc" },
    });

  const spanDays = Math.round((mid(toDate).getTime() - mid(fromDate).getTime()) / 86400000) + 1;
  const prevTo = addDays(fromDate, -1);
  const prevFrom = addDays(prevTo, -(spanDays - 1));

  const [txns, prevTxns] = await Promise.all([range(fromDate, toDate), range(prevFrom, prevTo)]);

  let totalExpense = 0;
  let totalIncome = 0;
  const totalCount = txns.length;

  const catMap = new Map<string, ReportCategoryRow>();
  const dayMap = new Map<string, ReportDayRow>();

  for (const t of txns) {
    if (t.type === "EXPENSE") totalExpense += t.amount;
    else totalIncome += t.amount;

    const day = t.date.toISOString().slice(0, 10);
    let dr = dayMap.get(day);
    if (!dr) {
      dr = { date: day, label: day, amount: 0, expense: 0, income: 0 };
      dayMap.set(day, dr);
    }
    dr.amount += t.type === "EXPENSE" ? t.amount : -t.amount;
    if (t.type === "EXPENSE") dr.expense += t.amount;
    else dr.income += t.amount;

    if (t.category) {
      let cr = catMap.get(t.categoryId);
      if (!cr) {
        cr = {
          categoryId: t.categoryId,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
          amount: 0,
          count: 0,
          previous: 0,
          changePct: null,
          sharePct: 0,
        };
        catMap.set(t.categoryId, cr);
      }
      cr.amount += t.amount;
      cr.count += 1;
    }
  }

  const prevCatMap = new Map<string, number>();
  let previousTotalExpense = 0;
  for (const t of prevTxns) {
    if (t.type !== "EXPENSE") continue;
    previousTotalExpense += t.amount;
    prevCatMap.set(t.categoryId, (prevCatMap.get(t.categoryId) ?? 0) + t.amount);
  }

  const categories = [...catMap.values()].map((c) => {
    const previous = prevCatMap.get(c.categoryId) ?? 0;
    const changePct = previous > 0 ? ((c.amount - previous) / previous) * 100 : null;
    const sharePct = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0;
    return { ...c, previous, changePct, sharePct };
  });
  categories.sort((a, b) => b.amount - a.amount);

  const days = [...dayMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const dt = new Date(d.date + "T00:00:00");
      const label = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()]} ${dt.getDate()}`;
      return { ...d, label };
    });

  const net = totalIncome - totalExpense;
  const changePct =
    previousTotalExpense > 0 ? ((totalExpense - previousTotalExpense) / previousTotalExpense) * 100 : null;

  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    totalExpense,
    totalIncome,
    totalCount,
    net,
    categories,
    days,
    previousTotalExpense,
    changePct,
  };
}
