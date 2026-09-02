"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Save, User, Landmark, Palette, Shield, BellRing, LayoutGrid } from "lucide-react";
import {
  updateProfileAction,
  updateCurrencyAction,
  updateThemeAction,
  updateWarningThresholdsAction,
  updateCooldownAction,
  updateDashboardCardsAction,
  deleteAccountAction,
  type ActionResult,
} from "@/actions/settings";
import { type UserSettings, type Budget } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PushNotificationsToggle } from "@/components/settings/push-notifications";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD"];

const DASHBOARD_CARDS = [
  { key: "budget", label: "Budget Status" },
  { key: "forecast", label: "Spending Forecast" },
  { key: "spending", label: "Daily Spending" },
  { key: "categories", label: "Category Breakdown" },
  { key: "recent", label: "Recent Transactions" },
];

function thresholdsOf(settings: UserSettings | null): Record<string, number> {
  const t = (settings?.warningThresholds ?? {}) as Record<string, number>;
  return {
    budget50: t.budget50 ?? 50,
    budget70: t.budget70 ?? 70,
    budget80: t.budget80 ?? 80,
    budget90: t.budget90 ?? 90,
    category80: t.category80 ?? 80,
    category90: t.category90 ?? 90,
    category100: t.category100 ?? 100,
  };
}

export function SettingsClient({
  settings,
  user,
}: {
  settings: UserSettings | null;
  user: { name: string | null; email: string | null } | null;
  budget?: Budget | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [name, setName] = React.useState(user?.name ?? "");
  const [currency, setCurrency] = React.useState(settings?.currency ?? "INR");
  const [theme, setTheme] = React.useState<(typeof settings extends null ? never : UserSettings["theme"]) | "system">(
    (settings?.theme as UserSettings["theme"]) ?? "system",
  );
  const [cards, setCards] = React.useState<string[]>((settings?.dashboardCards as string[]) ?? DASHBOARD_CARDS.map((c) => c.key));
  const thresholds = thresholdsOf(settings);

  const [cooldown, setCooldown] = React.useState(String(Math.round((settings?.coolDownThreshold ?? 0.1) * 100)));
  const [impulse, setImpulse] = React.useState(String(settings?.impulseThreshold ?? 0));
  const [maxAmount, setMaxAmount] = React.useState(String(settings?.maxTransactionAmount ?? 100000));

  const [confirmEmail, setConfirmEmail] = React.useState("");

  const run = async (fn: () => Promise<ActionResult>) => {
    startTransition(async () => {
      const res = await fn();
      if (res?.ok) {
        toast.success("Saved");
        router.refresh();
      } else {
        toast.error(res?.error ?? "Failed to save");
      }
    });
  };

  function toggleCard(key: string) {
    setCards((prev) => {
      const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
      run(() => updateDashboardCardsAction(next));
      return next;
    });
  }

  async function handleDelete() {
    if (confirmEmail !== user?.email) {
      toast.error("Email does not match");
      return;
    }
    if (!confirm("This permanently deletes your account and all data. Continue?")) return;
    await deleteAccountAction();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, preferences and controls.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Your name and account email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set("name", name);
                run(() => updateProfileAction(undefined, fd));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Currency</CardTitle>
            </div>
            <CardDescription>Display currency across the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => {
                  setCurrency(v);
                  const fd = new FormData();
                  fd.set("currency", v);
                  run(() => updateCurrencyAction(undefined, fd));
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Choose your color theme.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={String(theme)}
              onValueChange={(v) => {
                setTheme(v as UserSettings["theme"]);
                run(() => updateThemeAction(v as "light" | "dark" | "system"));
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Spending controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Spending Controls</CardTitle>
            </div>
            <CardDescription>Set thresholds that trigger confirmation prompts for large spending.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set("coolDownThreshold", cooldown);
                fd.set("impulseThreshold", impulse);
                fd.set("maxTransactionAmount", maxAmount);
                run(() => updateCooldownAction(undefined, fd));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="cooldown">Cool-down (% of remaining budget)</Label>
                <Input id="cooldown" type="number" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="impulse">Impulse threshold (₹) — 0 to disable</Label>
                <Input id="impulse" type="number" value={impulse} onChange={(e) => setImpulse(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max">Max transaction amount (₹)</Label>
                <Input id="max" type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save controls
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Push notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Reminders</CardTitle>
            </div>
            <CardDescription>Get nudged to track a payment you just made.</CardDescription>
          </CardHeader>
          <CardContent>
            <PushNotificationsToggle />
          </CardContent>
        </Card>
      </div>

      {/* Warning thresholds */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Warning Thresholds</CardTitle>
          </div>
          <CardDescription>When to warn you about budget usage (%)</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              for (const key of Object.keys(thresholdsOf(settings))) {
                fd.set(key, String((e.currentTarget.elements.namedItem(key) as HTMLInputElement | null)?.value ?? thresholds[key]));
              }
              run(() => updateWarningThresholdsAction(undefined, fd));
            }}
          >
            {Object.entries(thresholdsOf(settings)).map(([key, val]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{key}</Label>
                <Input id={key} name={key} type="number" defaultValue={val} min={0} max={100} />
              </div>
            ))}
            <div className="flex items-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save thresholds
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dashboard cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Dashboard Cards</CardTitle>
          </div>
          <CardDescription>Choose which cards appear on your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {DASHBOARD_CARDS.map((c) => (
              <li key={c.key} className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.label}</span>
                <Switch
                  checked={cards.includes(c.key)}
                  onCheckedChange={() => toggleCard(c.key)}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            <CardTitle>Danger Zone</CardTitle>
          </div>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="confirm-email">Type your email to confirm</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user?.email ?? "you@example.com"}
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmEmail !== user?.email}
            >
              <Trash2 className="h-4 w-4" /> Delete account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
