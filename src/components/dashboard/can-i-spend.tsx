"use client";

import * as React from "react";
import { CheckCircle2, TriangleAlert, Coffee, X } from "lucide-react";
import type { BudgetSummary } from "@/types";
import { formatINR } from "@/utils/currency";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export function CanISpend({ summary }: { summary: BudgetSummary }) {
  const { checkAmount, setCheckAmount, setAddExpenseOpen } = useUIStore();
  const [touched, setTouched] = React.useState(false);

  const amount = parseFloat(checkAmount);
  const hasBudget = summary.budget > 0;
  const valid = Number.isFinite(amount) && amount > 0;
  const remaining = Math.max(0, summary.remaining);

  const pctOfRemaining = valid && remaining > 0 ? (amount / remaining) * 100 : null;
  const thinkTwice = valid && pctOfRemaining != null && pctOfRemaining > 15;

  function handleAdd() {
    setAddExpenseOpen(true);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Coffee className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Can I spend this?</h2>
      </div>

      {!hasBudget ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Set a monthly budget to get instant guidance before you spend.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-2xl font-semibold text-primary">₹</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0"
              value={checkAmount}
              onChange={(e) => {
                setCheckAmount(e.target.value);
                setTouched(true);
              }}
              className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Amount you want to spend"
            />
            {checkAmount && (
              <button
                onClick={() => {
                  setCheckAmount("");
                  setTouched(false);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear amount"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Remaining: <strong>{formatINR(remaining)}</strong></span>
            <span>Daily safe: <strong>{formatINR(summary.dailySafeSpend)}/day</strong></span>
          </div>

          {touched && valid && (
            <div className="mt-4">
              <div
                className={cn(
                  "flex items-start gap-2 rounded-xl px-4 py-3 text-sm",
                  thinkTwice
                    ? "bg-warning/15 text-warning"
                    : "bg-success/10 text-success",
                )}
              >
                {thinkTwice ? (
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div>
                  {thinkTwice ? (
                    <>
                      <p className="font-semibold">Think twice</p>
                      <p>
                        This purchase would use around{" "}
                        <strong>{Math.round(pctOfRemaining!)}%</strong> of your
                        remaining monthly budget.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">Looks okay</p>
                      <p className="text-xs opacity-90">
                        This fits within your current spending plan
                        {pctOfRemaining != null
                          ? ` (${Math.round(pctOfRemaining)}% of remaining budget)`
                          : ""}
                        .
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setCheckAmount("");
                    setTouched(false);
                  }}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Add Expense
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
