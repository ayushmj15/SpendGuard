import { NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { endpoint?: string };
    if (!body?.endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }
    await deletePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push unsubscribe error:", err);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 },
    );
  }
}
