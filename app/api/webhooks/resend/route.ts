// app/api/webhooks/resend/route.ts
import { NextRequest } from "next/server";
import { pushEvent } from "@/lib/_state/resendEvents";

// Optional: set RESEND_WEBHOOK_SECRET and verify signature here.
// For now we accept and store.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Resend posts events with a 'type' and 'data' object (shape can vary by event)
    const type = body?.type || "unknown";
    const data = body?.data || {};
    const subject = data?.subject || data?.email?.subject;
    const to = data?.to || data?.email?.to;
    const id = data?.id || data?.email_id || body?.id;

    pushEvent({
      id,
      type,
      createdAt: Date.now(),
      to,
      subject,
      messageId: data?.message_id || data?.email?.message_id,
      data,
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}
