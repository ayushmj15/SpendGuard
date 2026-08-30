"use server";

import { revalidatePath } from "next/cache";
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

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const n = await db.notification.findFirst({ where: { id, userId } });
    if (!n) return { ok: false, error: "Notification not found" };
    await db.notification.update({ where: { id }, data: { read: true } });
    revalidatePath("/notifications");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update notification" };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    revalidatePath("/notifications");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update notifications" };
  }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const n = await db.notification.findFirst({ where: { id, userId } });
    if (!n) return { ok: false, error: "Notification not found" };
    await db.notification.delete({ where: { id } });
    revalidatePath("/notifications");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to delete notification" };
  }
}
