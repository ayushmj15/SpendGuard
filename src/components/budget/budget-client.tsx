"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, RotateCcw } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import type { BudgetSummary, CategoryTotals } from "@/types";
import {
  updateBudgetAction,
  updateCategoryBudgetAction,
  addCustomCategoryAction,
  deleteCategoryAction,
  updateBudgetRolloverAction,
} from "@/actions/budget";
import { formatINR } from "@/utils/currency";
import { resolveCategoryIcon } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BudgetRow = {
  id: string | null;
  name: string | null;
  amount: number | null;
  periodType: string | null;
  rolloverEnabled: boolean | null;
};

type SettingsRow = {
  coolDownThreshold: number | null;
} | null;

function BudgetFormButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save Budget
    </Button>
  );
}

export function BudgetClient({
  summary,
  categories,
  budget,
  settings,
}: {
  summary: BudgetSummary;
  categories: (CategoryTotals & { isDefault: boolean })[];
  budget: BudgetRow | null;
  settings: SettingsRow;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateBudgetAction, undefined);
  const [newCatName, setNewCatName] = React.useState("");
  const [editingCatId, setEditingCatId] = React.useState<string | null>(null);
  const [catBudgetInput, setCatBudgetInput] = React.useState("");

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Budget updated");
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  async function saveCategoryBudget(categoryId: string) {
    const val = catBudgetInput.trim();
    const amount = val === "" ? null : parseFloat(val);
    if (amount != null && !Number.isFinite(amount)) {
      toast.error("Enter a valid amount");
      return;
    }
    const res = await updateCategoryBudgetAction(categoryId, amount);
    if (res.ok) {
      toast.success(amount == null ? "Category budget cleared" : "Category budget updated");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to update");
    }
    setEditingCatId(null);
    setCatBudgetInput("");
  }

  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const res = await addCustomCategoryAction(name);
    if (res.ok) {
      toast.success("Category added");
      router.refresh();
      setNewCatName("");
    } else {
      toast.error(res.error ?? "Failed to add category");
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    const cat = categories.find((c) => c.categoryId === categoryId);
    if (!confirm(`Delete the "${cat?.name}" category? Its transactions will move to "Other".`)) return;
    const res = await deleteCategoryAction(categoryId);
    if (res.ok) {
      toast.success("Category deleted");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to delete");
    }
  }

  const toggleRollover = async (enabled: boolean) => {
    const res = await updateBudgetRolloverAction(enabled);
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
        <p className="text-sm text-muted-foreground">
          Set a monthly budget and per-category limits.
        </p>
      </div>

      {/* Monthly budget */}
      <form action={formAction} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Monthly Budget</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.budget > 0
            ? `${formatINR(summary.spent)} of ${formatINR(summary.budget)} used this month`
            : "No budget set yet — add one to start tracking."}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Monthly amount (₹)</Label>
            <Input
              id="budget-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={budget?.amount != null ? String(budget.amount) : ""}
              placeholder="e.g. 30000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-name">Name</Label>
            <Input
              id="budget-name"
              name="name"
              defaultValue={budget?.name ?? "Monthly Budget"}
            />
          </div>
        </div>

        <input type="hidden" name="periodType" value="MONTHLY" />
        <input type="hidden" name="rolloverEnabled" value={budget?.rolloverEnabled ? "true" : "false"} />

        {state?.error && !state.ok && (
          <p className="mt-2 text-sm text-destructive">{state.error}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <BudgetFormButton />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              defaultChecked={budget?.rolloverEnabled ?? false}
              onChange={(e) => toggleRollover(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="inline-flex items-center gap-1">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Roll over unused budget to next month
            </span>
          </label>
        </div>
      </form>

      {/* Category budgets */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Category Budgets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional limits per category to keep your spending in check.
        </p>

        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {categories.map((cat) => {
              const Icon = resolveCategoryIcon(cat.icon);
              const isEditing = editingCatId === cat.categoryId;
              const pct = cat.budget && cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
              return (
                <li key={cat.categoryId} className="flex flex-wrap items-center gap-3 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${cat.color}22` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: cat.color }} />
                  </div>

                  <div className="min-w-[140px] flex-1">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatINR(cat.spent)} spent
                      {cat.budget != null ? ` · of ${formatINR(cat.budget)}` : ""}
                    </p>
                  </div>

                  {cat.budget != null && cat.budget > 0 && (
                    <div className="hidden w-28 sm:block">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary",
                          )}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount or blank to clear"
                        autoFocus
                        value={catBudgetInput}
                        onChange={(e) => setCatBudgetInput(e.target.value)}
                        className="w-40"
                      />
                      <Button size="sm" onClick={() => saveCategoryBudget(cat.categoryId)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCatId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCatId(cat.categoryId);
                          setCatBudgetInput(cat.budget != null ? String(cat.budget) : "");
                        }}
                      >
                        {cat.budget != null ? "Edit" : "+ Budget"}
                      </Button>
                      {!cat.isDefault && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${cat.name}`}
                          onClick={() => handleDeleteCategory(cat.categoryId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add custom category */}
      <div className="rounded-2xl border border-dashed p-6">
        <h2 className="font-semibold">Add a custom category</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your own spending category (e.g. a subscription or hobby).
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category name"
            className="max-w-xs"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
          />
          <Button onClick={handleAddCategory} disabled={!newCatName.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
