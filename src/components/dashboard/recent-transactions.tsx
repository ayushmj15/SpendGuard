"use client";

import Link from "next/link";
import { ArrowRight, ArrowDownLeft } from "lucide-react";
import { formatINR } from "@/utils/currency";
import { formatMedium } from "@/utils/date";
import { resolveCategoryIcon } from "@/lib/constants";
import { cn } from "@/lib/utils";

type RecentTxn = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  note: string | null;
  category: { name: string; color: string; icon: string } | null;
  paymentMethod: string;
  date: Date;
};

export function RecentTransactions({ transactions }: { transactions: RecentTxn[] }) {
  if (!transactions || transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet. Add your first one!</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {transactions.map((t) => {
        const isIncome = t.type === "INCOME";
        const Icon = t.category ? resolveCategoryIcon(t.category.icon) : (isIncome ? ArrowDownLeft : null);
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${t.category?.color ?? "#94a3b8"}22` }}
            >
              {Icon ? (
                <Icon className="h-5 w-5" style={{ color: t.category?.color ?? "#94a3b8" }} />
              ) : (
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t.description || (t.category?.name ?? "Transaction")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatMedium(t.date)}
                {t.category ? ` · ${t.category.name}` : ""}
              </p>
            </div>

            <span
              className={cn(
                "shrink-0 text-sm font-semibold",
                isIncome ? "text-success" : "text-foreground",
              )}
            >
              {isIncome ? "+" : "−"}{formatINR(t.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function RecentHeader() {
  return (
    <Link
      href="/transactions"
      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      View all <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
