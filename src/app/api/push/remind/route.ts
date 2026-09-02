import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

/**
 * Sends "log your expense" reminder pushes to subscribed users who have not
 * recorded a transaction recently.
 *
 * Invoked by Vercel Cron (vercel.json) — the vercel-cron user-agent is trusted.
 * External schedulers must call with `Authorization: Bearer <CRON_SECRET>` or a
 * `?token=<CRON_SECRET>` query param matching process.env.CRON_SECRET.
 */

const REMINDER_WINDOW_MS = 8 * 60 * 60 * 1000; // remind if no tx logged in last 8h

/** Constant-time string comparison to reduce timing side channels. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  // Trust Vercel's own scheduler (it sets the vercel-cron user-agent and cannot
  // set custom headers or carry env vars in the cron path). For external
  // schedulers (GitHub Actions, cURL, etc.), require a matching token.
  const fromVercelCron = /vercel-cron/i.test(req.headers.get("user-agent") ?? "");

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (!fromVercelCron) {
    // Accept the secret via an Authorization Bearer header or a `token` query param.
    const url = new URL(req.url);
    const headerToken = req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    const queryToken = url.searchParams.get("token");
    const received = headerToken ?? queryToken;

    if (!received || !safeEqual(received, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const cutoff = new Date(Date.now() - REMINDER_WINDOW_MS);

    // Every subscribed user
    const subs = await db.pushSubscription.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });

    let sent = 0;
    let skipped = 0;

    for (const { userId } of subs) {
      const lastTx = await db.transaction.findFirst({
        where: { userId, createdAt: { gte: cutoff } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (lastTx) {
        skipped += 1;
        continue;
      }
      const delivered = await sendPushToUser(userId, {
        title: "Did you just spend?",
        body: "Tap to log your latest expense so your budget stays accurate.",
        url: "/transactions",
        tag: "spendguard-reminder",
      });
      sent += delivered;
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (err) {
    console.error("push remind error:", err);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
