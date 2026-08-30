import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/utils/calculations";

const STATUS_META: Record<
  BudgetStatus,
  { label: string; badge: string; text: string; bar: string }
> = {
  HEALTHY: {
    label: "Healthy",
    badge: "border-transparent bg-success/15 text-success",
    text: "text-success",
    bar: "bg-success",
  },
  WATCH: {
    label: "Watch",
    badge: "border-transparent bg-primary/15 text-primary",
    text: "text-primary",
    bar: "bg-primary",
  },
  WARNING: {
    label: "Warning",
    badge: "border-transparent bg-warning/20 text-warning",
    text: "text-warning",
    bar: "bg-warning",
  },
  CRITICAL: {
    label: "Critical",
    badge: "border-transparent bg-orange-500/20 text-orange-600 dark:text-orange-400",
    text: "text-orange-600 dark:text-orange-400",
    bar: "bg-orange-500",
  },
  EXCEEDED: {
    label: "Exceeded",
    badge: "border-transparent bg-destructive/15 text-destructive",
    text: "text-destructive",
    bar: "bg-destructive",
  },
};

export function budgetStatusClass(status: BudgetStatus) {
  return STATUS_META[status] ?? STATUS_META.HEALTHY;
}

export function StatusBadge({
  status,
  className,
}: {
  status: BudgetStatus;
  className?: string;
}) {
  const meta = budgetStatusClass(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        meta.badge,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function BudgetBar({
  value,
  status,
  className,
}: {
  value: number;
  status: BudgetStatus;
  className?: string;
}) {
  const meta = budgetStatusClass(status);
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full progress-transition", meta.bar)}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

/** Semantic color for numbers based on status (for remaining/safe spend). */
export function moneyClass(status: BudgetStatus): string {
  return budgetStatusClass(status).text;
}
