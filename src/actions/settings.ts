"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function upsertSettings(userId: string, data: Record<string, unknown>) {
  const existing = await db.userSettings.findUnique({ where: { userId } });
  if (existing) {
    return db.userSettings.update({ where: { userId }, data });
  }
  return db.userSettings.create({ data: { userId, ...data } as never });
}

export async function updateProfileAction(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters" };

    await db.user.update({ where: { id: userId }, data: { name } });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update profile" };
  }
}

export async function updateCurrencyAction(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const currency = String(formData.get("currency") ?? "INR");
    await upsertSettings(userId, { currency });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update currency" };
  }
}

export async function updateThemeAction(theme: "light" | "dark" | "system"): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await upsertSettings(userId, { theme });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update theme" };
  }
}

export async function updateWarningThresholdsAction(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();

    const num = (key: string, def: number) => {
      const v = parseFloat(formData.get(key) as string);
      return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : def;
    };

    const thresholds = {
      budget50: num("budget50", 50),
      budget70: num("budget70", 70),
      budget80: num("budget80", 80),
      budget90: num("budget90", 90),
      budget100: num("budget100", 100),
      category80: num("category80", 80),
      category90: num("category90", 90),
      category100: num("category100", 100),
    };

    // Load existing and merge
    const existing = await db.userSettings.findUnique({ where: { userId } });
    const current = (existing?.warningThresholds as Record<string, number>) ?? {};
    await upsertSettings(userId, { warningThresholds: { ...current, ...thresholds } });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update warning thresholds" };
  }
}

export async function updateCooldownAction(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const pct = parseFloat(formData.get("coolDownThreshold") as string);
    const impulse = parseFloat(formData.get("impulseThreshold") as string);
    const max = parseFloat(formData.get("maxTransactionAmount") as string);

    const existing = await db.userSettings.findUnique({ where: { userId } });
    const current = (existing?.warningThresholds as Record<string, number>) ?? {};

    await upsertSettings(userId, {
      coolDownThreshold: Number.isFinite(pct) ? pct / 100 : 0.1,
      impulseThreshold: Number.isFinite(impulse) ? impulse : 0,
      maxTransactionAmount: Number.isFinite(max) && max > 0 ? max : 100000,
      warningThresholds: current,
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update spending controls" };
  }
}

export async function updateDashboardCardsAction(cards: string[]): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await upsertSettings(userId, { dashboardCards: cards });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update dashboard" };
  }
}

export async function deleteAccountAction(): Promise<void> {
  const userId = await getUserId();
  await db.user.delete({ where: { id: userId } });
  redirect("/login");
}
