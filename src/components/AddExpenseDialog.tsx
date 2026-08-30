"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/constants";
import { transactionFormSchema, type TransactionFormInput } from "@/lib/validations/transaction";
import {
  getCategoriesAction,
  getBudgetSummaryAction,
  getSettingsAction,
} from "@/actions/query";
import { createTransactionAction } from "@/actions/transactions";
import { resolveCategoryIcon } from "@/lib/constants";
import { formatINR } from "@/utils/currency";

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

interface PendingConfirmation {
  type: "cooldown" | "impulse";
  message: string;
  amount: number;
}

export function AddExpenseDialog() {
  const { addExpenseOpen, setAddExpenseOpen, checkAmount, setCheckAmount } = useUIStore();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [coolDownPct, setCoolDownPct] = React.useState(0.1);
  const [impulseThreshold, setImpulseThreshold] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<PendingConfirmation | null>(null);

  const form = useForm<TransactionFormInput, unknown, TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema) as Resolver<TransactionFormInput>,
    defaultValues: {
      type: "EXPENSE",
      amount: "",
      categoryId: "",
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: "UPI",
      description: "",
      note: "",
    },
  });

  const type = form.watch("type");

  // Load data when the dialog opens
  React.useEffect(() => {
    if (!addExpenseOpen) return;
    setConfirmation(null);
    (async () => {
      try {
        const [cats, summary, settings] = await Promise.all([
          getCategoriesAction(),
          getBudgetSummaryAction(),
          getSettingsAction(),
        ]);
        setCategories(cats);
        if (summary) setRemaining(summary.remaining);
        if (settings?.settings) {
          setCoolDownPct(settings.settings.coolDownThreshold ?? 0.1);
          setImpulseThreshold(settings.settings.impulseThreshold ?? 0);
        }
      } catch {
        // ignore - will retry next open
      }
    })();
  }, [addExpenseOpen]);

  // Reset form when opened fresh, preloading the "Can I spend this?" amount
  React.useEffect(() => {
    if (addExpenseOpen) {
      const preload = checkAmount.trim();
      form.reset({
        type: "EXPENSE",
        amount: preload,
        categoryId: categories[0]?.id ?? "",
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: "UPI",
        description: "",
        note: "",
      });
      if (preload) setCheckAmount("");
      setConfirmation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addExpenseOpen]);

  const evaluate = (vals: TransactionFormInput) => {
    const amount = parseFloat(vals.amount);
    if (vals.type !== "EXPENSE" || !Number.isFinite(amount) || amount <= 0) return null;
    if (remaining == null) return null;

    const neededConfirmation: PendingConfirmation[] = [];

    if (remaining > 0 && amount > 0 && amount / remaining > coolDownPct) {
      neededConfirmation.push({
        type: "cooldown",
        message: `You are about to spend ${formatINR(amount)}. That is ${Math.round((amount / remaining) * 100)}% of your remaining monthly budget.`,
        amount,
      });
    }
    if (impulseThreshold > 0 && amount > impulseThreshold) {
      neededConfirmation.push({
        type: "impulse",
        message: `This expense (${formatINR(amount)}) is relatively large. Consider whether it fits your plan right now.`,
        amount,
      });
    }
    return neededConfirmation;
  };

  async function doSubmit(vals: TransactionFormInput) {
    setSubmitting(true);
    const result = await createTransactionAction({
      type: vals.type,
      amount: parseFloat(vals.amount),
      categoryId: vals.categoryId,
      date: new Date(vals.date),
      paymentMethod: vals.paymentMethod,
      description: vals.description,
      note: vals.note,
    });
    setSubmitting(false);
    if (result.ok) {
      toast.success(vals.type === "EXPENSE" ? "Expense added successfully." : "Income added.");
      setAddExpenseOpen(false);
      setConfirmation(null);
    } else {
      toast.error(result.error ?? "Failed to save expense");
    }
  }

  const onSubmit = (vals: TransactionFormInput) => {
    const checks = evaluate(vals);
    if (checks && checks.length > 0) {
      setConfirmation({
        type: checks[0].type,
        message: checks.map((c) => c.message).join(" "),
        amount: checks[0].amount,
      });
      return;
    }
    void doSubmit(vals);
  };

  const selectedCategory = categories.find((c) => c.id === form.watch("categoryId"));

  return (
    <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
      <DialogContent className="sm:max-w-md">
        {confirmation ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
                {confirmation.type === "cooldown" ? "Are you sure?" : "Quick check"}
              </DialogTitle>
              <DialogDescription className="pt-2 whitespace-pre-line">
                {confirmation.message}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmation(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant={confirmation.type === "cooldown" ? "warning" : "default"}
                onClick={() => void doSubmit(form.getValues())}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Expense
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription>
                Quickly log how much you spent.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(
                  [
                    { value: "EXPENSE", label: "Expense", icon: ArrowUpRight },
                    { value: "INCOME", label: "Income", icon: ArrowDownLeft },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => form.setValue("type", opt.value)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                      type === opt.value
                        ? opt.value === "EXPENSE"
                          ? "bg-background text-foreground shadow"
                          : "bg-success text-success-foreground shadow"
                        : "text-muted-foreground",
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  className="h-12 text-lg font-semibold"
                  {...form.register("amount")}
                  autoFocus
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.watch("categoryId")}
                  onValueChange={(v) => form.setValue("categoryId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => {
                      const Icon = resolveCategoryIcon(c.icon);
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
                )}
              </div>

              {/* Date + payment method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    {...form.register("date")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment</Label>
                  <Select
                    value={form.watch("paymentMethod")}
                    onValueChange={(v) => form.setValue("paymentMethod", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder={selectedCategory ? `${selectedCategory.name} expense` : "e.g. Lunch"}
                  {...form.register("description")}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="note">Notes (optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Any extra detail"
                  rows={2}
                  {...form.register("note")}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAddExpenseOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {type === "EXPENSE" ? "Save Expense" : "Save Income"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
