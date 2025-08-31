import { NextResponse } from "next/server";
import { listDrafts, markStatus } from "@/lib/newsletter/store";
import { sendNewsletter } from "@/lib/newsletter/send";

export const dynamic = "force-dynamic";

export async function GET() {
  const drafts = await listDrafts();
  const now = Date.now();
  let sent = 0;

  for (const d of drafts) {
    if (d.status === "scheduled" && d.scheduleAt && new Date(d.scheduleAt).getTime() <= now) {
      await sendNewsletter(d);
      await markStatus(d.id, "sent");
      sent++;
    }
  }
  return NextResponse.json({ ok: true, sent });
}
