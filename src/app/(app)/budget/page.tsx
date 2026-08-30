import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getBudgetSummary, getCategoryTotals } from "@/services/spending";
import { BudgetClient } from "@/components/budget/budget-client";

export const metadata: Metadata = {
  title: "Budget",
};

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const [summary, categoryTotals, categories, budget, settings] = await Promise.all([
    getBudgetSummary(userId),
    getCategoryTotals(userId, monthStart, monthEnd),
    db.category.findMany({ where: { userId }, select: { id: true, isDefault: true } }),
    db.budget.findFirst({ where: { userId } }),
    db.userSettings.findUnique({ where: { userId } }),
  ]);

  const defaults = new Map(categories.map((c) => [c.id, c.isDefault]));
  const merged = categoryTotals.map((c) => ({ ...c, isDefault: defaults.get(c.categoryId) ?? false }));

  return (
    <BudgetClient
      summary={summary}
      categories={merged}
      budget={budget}
      settings={settings}
    />
  );
}
