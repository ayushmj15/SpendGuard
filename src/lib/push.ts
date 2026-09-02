import webpush from "web-push";
import { db } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Server-side helpers for Web Push notifications.
 * Requires VAPID keys (see .env): VAPID_PUBLIC_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY and VAPID_SUBJECT.
 */

function getVapidConfig() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ?? "mailto:admin@spendguard.app";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys are not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

interface SubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Persist the user's push subscription (idempotent by endpoint). */
export async function savePushSubscription(
  userId: string,
  sub: SubscriptionPayload,
) {
  return db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: {
      userId,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  });
}

/** Remove a stored subscription by its endpoint. */
export async function deletePushSubscription(endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}

export interface PushNotification {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to every subscription of a user.
 * Stale subscriptions (410 Gone / 404 Not Found) are removed automatically.
 * Returns the number of successfully reached devices.
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotification,
): Promise<number> {
  getVapidConfig();

  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  let delivered = 0;
  const deadEndpoints: string[] = [];

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.url ?? "/",
    tag: notification.tag ?? "spendguard-reminder",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        delivered += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // Subscription is gone or invalid on the push service side.
        if (statusCode === 410 || statusCode === 404 || statusCode === 400) {
          deadEndpoints.push(sub.endpoint);
        }
      }
    }),
  );

  if (deadEndpoints.length > 0) {
    await db.pushSubscription.deleteMany({
      where: { endpoint: { in: deadEndpoints } },
    });
  }

  return delivered;
}
