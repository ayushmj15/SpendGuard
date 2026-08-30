"use client";

import * as React from "react";
import { Loader2, Lock, Unlock, Settings2 } from "lucide-react";
import { getSpendingLockAction, type LockStatus } from "@/actions/lock";
import { useUIStore } from "@/store/ui-store";
import { formatINR } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SpendLockCard() {
  const [status, setStatus] = React.useState<LockStatus | null>(null);
  const setOpen = useUIStore((s) => s.setLockOpen);

  React.useEffect(() => {
    getSpendingLockAction()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const locked = status?.enabled ?? false;
  const available = status && status.overBudget ? 0 : status?.lockedAmount ?? 0;

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        locked ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          {locked ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4" />}
          <h2 className="font-semibold">Spending Lock</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Configure lock">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {status ? (
        <div className="mt-3">
          <p className={cn("text-lg font-bold", locked && "text-destructive")}>
            {locked ? "Locked" : "Unlocked"}
          </p>
          <p className="text-sm text-muted-foreground">
            {locked
              ? `Available to spend: ${formatINR(available)}${
                  status.overBudget ? " — currently over budget" : ""
                }`
              : "Set a cap to block over-budget expenses."}
          </p>
          <Button
            size="sm"
            variant={locked ? "destructive" : "outline"}
            className="mt-3"
            onClick={() => setOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
            {locked ? "Manage lock" : "Enable lock"}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> Loading…
        </p>
      )}
    </section>
  );
}
