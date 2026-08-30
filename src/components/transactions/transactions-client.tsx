"use client";

import * as React from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Pencil,
  Trash2,
  X,
  Loader2,
  ArrowRight,
  Upload,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { getTransactionsAction, getCategoriesAction } from "@/actions/query";
import {
  updateTransactionAction,
  deleteTransactionAction,
} from "@/actions/transactions";
import { ImportCsvDialog } from "@/components/transactions/import-csv-dialog";
import { transactionFormSchema, type TransactionFormInput } from "@/lib/validations/transaction";
import { resolveCategoryIcon, PAYMENT_METHODS, TRANSACTION_TYPES } from "@/lib/constants";
import { formatINR } from "@/utils/currency";
import { formatDayFirst, formatTime } from "@/utils/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; icon: string; color: string };
type Txn = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  note: string | null;
  date: Date;
  paymentMethod: string;
  category: Category | null;
};

const PAGE_SIZE = 30;

export function TransactionsClient() {
  const [txns, setTxns] = React.useState<Txn[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(false);
  const [editing, setEditing] = React.useState<Txn | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const { setAddExpenseOpen } = useUIStore();

  const load = React.useCallback(
    async (opts?: { append?: boolean; offset?: number }) => {
      try {
        const { transactions, total: t } = await getTransactionsAction({
          limit: PAGE_SIZE,
          offset: opts?.offset ?? 0,
          categoryId: categoryId || undefined,
          type: type || undefined,
          from: from || undefined,
          to: to || undefined,
          query: search || undefined,
        });
        const typed = transactions as unknown as Txn[];
        setTxns((prev) => (opts?.append ? [...prev, ...typed] : typed));
        setTotal(t);
        setHasMore(t > (opts?.offset ?? 0) + typed.length);
      } catch {
        toast.error("Couldn't load transactions");
      } finally {
        setLoading(false);
      }
    },
    [categoryId, type, from, to, search],
  );

  React.useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  React.useEffect(() => {
    getCategoriesAction()
      .then((c) => setCategories(c as unknown as Category[]))
      .catch(() => {});
  }, []);

  function refresh() {
    setLoading(true);
    load();
  }

  async function handleDelete(t: Txn) {
    if (!confirm(`Delete this ${t.type.toLowerCase()} of ${formatINR(t.amount)}?`)) return;
    const result = await deleteTransactionAction(t.id);
    if (result.ok) {
      toast.success("Transaction deleted");
      refresh();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {total} transaction{total === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
        <Button onClick={() => setAddExpenseOpen(true)}>
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {TRANSACTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setType("");
              setCategoryId("");
              setFrom("");
              setTo("");
            }}
          >
            <X className="h-4 w-4" /> Clear filters
          </Button>
        </div>
      </div>

      {/* List */}
      {loading && txns.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading transactions…
        </div>
      ) : txns.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No transactions match your filters.</p>
          <Button className="mt-4" onClick={() => setAddExpenseOpen(true)}>
            <Plus className="h-4 w-4" /> Add your first transaction
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {txns.map((t) => (
              <TransactionRow
                key={t.id}
                txn={t}
                onEdit={() => setEditing(t)}
                onDelete={() => handleDelete(t)}
              />
            ))}
          </ul>
          {hasMore && (
            <div className="border-t border-border p-3 text-center">
              <Button
                variant="ghost"
                onClick={() => load({ append: true, offset: txns.length })}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <EditTransactionDialog
        txn={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
    </div>
  );
}

function TransactionRow({
  txn,
  onEdit,
  onDelete,
}: {
  txn: Txn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = txn.type === "INCOME";
  const Icon = txn.category ? resolveCategoryIcon(txn.category.icon) : null;
  const payLabel = PAYMENT_METHODS.find((p) => p.value === txn.paymentMethod)?.label ?? txn.paymentMethod;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${txn.category?.color ?? "#94a3b8"}22` }}
      >
        {Icon ? (
          <Icon className="h-5 w-5" style={{ color: txn.category?.color ?? "#94a3b8" }} />
        ) : (
          (isIncome ? <ArrowDownLeft className="h-5 w-5 text-muted-foreground" /> : <ArrowUpRight className="h-5 w-5 text-muted-foreground" />)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {txn.description || txn.category?.name || "Transaction"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDayFirst(txn.date)} · {formatTime(txn.date)}
          {txn.note ? ` · ${txn.note}` : ""}
        </p>
        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {payLabel}
        </span>
      </div>

      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          isIncome ? "text-success" : "text-foreground",
        )}
      >
        {isIncome ? "+" : "−"}{formatINR(txn.amount)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <button onClick={onEdit} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function EditTransactionDialog({
  txn,
  categories,
  onClose,
  onSaved,
}: {
  txn: Txn | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<TransactionFormInput, unknown, TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema) as any,
    values: txn
      ? {
          type: txn.type as "EXPENSE" | "INCOME",
          amount: String(txn.amount),
          categoryId: txn.category?.id ?? "",
          date: new Date(txn.date).toISOString().slice(0, 10),
          paymentMethod: txn.paymentMethod as TransactionFormInput["paymentMethod"],
          description: txn.description ?? "",
          note: txn.note ?? "",
        }
      : undefined,
  });

  React.useEffect(() => {
    if (!txn && form.formState.isDirty) form.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txn]);

  if (!txn) return null;

  const selectedCategory = categories.find((c) => c.id === form.watch("categoryId"));

  async function onSubmit(vals: TransactionFormInput) {
    if (!txn) return;
    setSubmitting(true);
    const result = await updateTransactionAction(txn.id, {
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
      toast.success("Transaction updated");
      onClose();
      onSaved();
    } else {
      toast.error(result.error ?? "Failed to update");
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update the details of this transaction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {(["EXPENSE", "INCOME"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue("type", t)}
                  className={cn(
                    "rounded-md py-1.5 text-sm font-medium",
                    form.watch("type") === t
                      ? t === "EXPENSE"
                        ? "bg-background shadow"
                        : "bg-success text-success-foreground shadow"
                      : "text-muted-foreground",
                  )}
                >
                  {t === "EXPENSE" ? "Expense" : "Income"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount (₹)</Label>
            <Input id="edit-amount" type="number" step="0.01" {...form.register("amount")} />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch("categoryId")}
              onValueChange={(v) => form.setValue("categoryId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => {
                  const Icon = resolveCategoryIcon(c.icon);
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: c.color }} /> {c.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" {...form.register("date")} />
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select
                value={form.watch("paymentMethod")}
                onValueChange={(v) => form.setValue("paymentMethod", v as TransactionFormInput["paymentMethod"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description (optional)</Label>
            <Input id="edit-desc" placeholder={selectedCategory ? `${selectedCategory.name} expense` : "e.g. Lunch"} {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-note">Notes (optional)</Label>
            <Input id="edit-note" {...form.register("note")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
