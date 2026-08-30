import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Exports the user's data as CSV or JSON.
 * Content-Type is negotiated via the `format` query param.
 * Only the authorized user's own data is included.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";

  const [user, categories, transactions, budget, budgetPeriods, settings] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, createdAt: true },
      }),
      db.category.findMany({ where: { userId } }),
      db.transaction.findMany({
        where: { userId },
        include: { category: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
      db.budget.findMany({ where: { userId } }),
      db.budgetPeriod.findMany({ where: { userId }, orderBy: { startDate: "desc" } }),
      db.userSettings.findUnique({ where: { userId } }),
    ]);

  const payload = { user, categories, transactions, budgets: budget, budgetPeriods, settings };

  if (format === "json") {
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="spendguard-export.json"',
      },
    });
  }

  // CSV export of transactions (the most useful daily-use format)
  const header = "date,type,amount,category,description,paymentMethod,note\n";
  const lines = transactions
    .map((t) =>
      [
        t.date.toISOString().slice(0, 10),
        t.type,
        t.amount,
        `"${(t.category?.name ?? "").replace(/"/g, '""')}"`,
        `"${(t.description ?? "").replace(/"/g, '""')}"`,
        t.paymentMethod,
        `"${(t.note ?? "").replace(/"/g, '""')}"`,
      ].join(","),
    )
    .join("\n");

  return new NextResponse(header + lines, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="spendguard-transactions.csv"',
    },
  });
}
