// app/api/newsletter/dispatch/route.ts
import { NextResponse } from "next/server";
import { listDrafts, markStatus } from "@/lib/newsletter/store";
import { sendNewsletter } from "@/lib/newsletter/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// allow either POST or GET to trigger the dispatcher
export async function POST() {
  return dispatchNow();
}
export async function GET() {
  return dispatchNow();
}

async function dispatchNow() {
  const drafts = await listDrafts();
  const now = Date.now();
  let sent = 0;

  for (const d of drafts) {
    // ✅ use `scheduledAt` everywhere
    if (d.status === "scheduled" && d.scheduledAt) {
      const when = new Date(d.scheduledAt).getTime();
      if (Number.isFinite(when) && when <= now) {
        await sendNewsletter(d);
        await markStatus(d.id, "sent");
        sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
