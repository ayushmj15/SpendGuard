"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  CircleAlert,
  TrendingUp,
  ShieldAlert,
  Wallet,
  Tag,
  Trash2,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
} from "@/actions/notifications";
import { cn } from "@/lib/utils";
import { formatRelative, formatTime } from "@/utils/date";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

const TYPE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  BUDGET_WARNING: { icon: CircleAlert, color: "text-warning", bg: "bg-warning/15" },
  BUDGET_EXCEEDED: { icon: Wallet, color: "text-destructive", bg: "bg-destructive/15" },
  CATEGORY_WARNING: { icon: Tag, color: "text-primary", bg: "bg-primary/15" },
  LARGE_EXPENSE: { icon: ShieldAlert, color: "text-orange-500", bg: "bg-orange-500/15" },
  FORECAST_WARNING: { icon: TrendingUp, color: "text-warning", bg: "bg-warning/15" },
  MONTHLY_SUMMARY: { icon: Bell, color: "text-success", bg: "bg-success/15" },
  SYSTEM: { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" },
};

export function NotificationsClient({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);

  const unread = notifications.filter((n) => !n.read).length;
  const sorted = [...notifications].sort(
    (a, b) => Number(Boolean(b.read)) - Number(Boolean(a.read)) || +new Date(b.createdAt) - +new Date(a.createdAt),
  );

  async function markRead(id: string) {
    setPending(id);
    const res = await markNotificationReadAction(id);
    setPending(null);
    if (res.ok) router.refresh();
    else toast.error(res.error ?? "Failed to update");
  }

  async function markAll() {
    setWorking(true);
    const res = await markAllNotificationsReadAction();
    setWorking(false);
    if (res.ok) router.refresh();
    else toast.error(res.error ?? "Failed to update");
  }

  async function remove(id: string) {
    setPending(id);
    const res = await deleteNotificationAction(id);
    setPending(null);
    if (res.ok) router.refresh();
    else toast.error(res.error ?? "Failed to delete");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            disabled={working}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Mark all as read
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No notifications yet. Alerts about your budget and spending will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {sorted.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            const Icon = meta.icon;
            return (
              <li
                key={n.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-4 transition-colors",
                  !n.read && "bg-accent/40",
                )}
              >
                <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.bg)}>
                  <Icon className={cn("h-4 w-4", meta.color)} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm font-medium", !n.read && "font-semibold")}>{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(n.createdAt)} · {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      disabled={pending === n.id}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      {pending === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    disabled={pending === n.id}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label="Delete notification"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
