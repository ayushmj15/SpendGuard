"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, KeyRound } from "lucide-react";
import { getSpendingLockAction, setSpendingLockAction, type LockStatus } from "@/actions/lock";
import { useUIStore } from "@/store/ui-store";
import { formatINR } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function SpendLockDialog() {
  const open = useUIStore((s) => s.lockOpen);
  const setOpen = useUIStore((s) => s.setLockOpen);

  const [status, setStatus] = React.useState<LockStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [cap, setCap] = React.useState("");

  React.useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setLoading(true);
      getSpendingLockAction()
        .then((s) => {
          setStatus(s);
          setCap(s.amount && s.amount > 0 ? String(s.amount) : "");
        })
        .catch(() => toast.error("Couldn't load lock status"))
        .finally(() => setLoading(false));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  async function toggle(enabled: boolean) {
    if (!status) return;
    setSaving(true);
    const parsedCap = parseFloat(cap);
    const result = await setSpendingLockAction(
      enabled,
      Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : null,
    );
    setSaving(false);
    setStatus(result);
    toast.success(enabled ? "Spending lock enabled" : "Spending lock disabled");
  }

  function available() {
    if (!status) return 0;
    return status.overBudget ? 0 : status.lockedAmount;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Spending Lock</DialogTitle>
          <DialogDescription>
            Set a hard cap. When enabled, you can&apos;t add an expense that exceeds the available amount.
          </DialogDescription>
        </DialogHeader>

        {loading || !status ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4",
                status.enabled ? "border-destructive/40 bg-destructive/5" : "border-border",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  status.enabled ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success",
                )}
              >
                {status.enabled ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {status.enabled ? "Spending locked" : "Spending unlocked"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status.enabled
                    ? `Available: ${formatINR(available())}${status.overBudget ? " (over budget)" : ""}`
                    : "You are free to spend"}
                </p>
              </div>
              <div className="ml-auto">
                <Switch
                  checked={status.enabled}
                  onCheckedChange={toggle}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cap">Lock amount (₹) — optional, blank uses remaining budget</Label>
              <Input
                id="cap"
                type="number"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                placeholder={formatINR(status.lockedAmount)}
              />
              <p className="text-xs text-muted-foreground">
                Current remaining budget: <span className="font-medium text-foreground">{formatINR(status.remaining)}</span>
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            <KeyRound className="h-4 w-4" /> Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
