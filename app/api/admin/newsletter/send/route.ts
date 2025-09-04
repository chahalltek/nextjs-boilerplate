import { NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";

// small util
function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function getRecipients(adminKey: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const r = await fetch(`${base}/api/admin/newsletter/recipients`, {
    headers: { authorization: `Bearer ${adminKey}` },
    cache: "no-store",
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`recipients fetch failed: ${r.status} ${t}`);
  }
  const j = await r.json();
  return (j?.recipients as string[]) || [];
}

export async function POST(req: Request) {
  const adminKey = process.env.ADMIN_API_KEY || "";
  const auth = req.headers.get("authorization") || "";
  const isAuthorized = auth.startsWith("Bearer ") && auth.slice(7) === adminKey;

  if (!isAuthorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dry = ["1", "true", "yes"].includes((url.searchParams.get("dry") || "").toLowerCase());

  let payload: { subject?: string; html?: string; scheduleAt?: string } = {};
  try {
    payload = await req.json();
  } catch {}
  const subject = (payload.subject || "").trim();
  const html = String(payload.html || "");
  const scheduleAt = (payload.scheduleAt || "").trim();

  if (!subject) return NextResponse.json({ error: "missing subject" }, { status: 400 });
  if (!html && !scheduleAt) return NextResponse.json({ error: "missing html" }, { status: 400 });

  const recipients = await getRecipients(adminKey);
  const batches = chunk(recipients, 90);

  // DRY RUN – never touch Resend
  if (dry) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      subject,
      from: "admin@heyskolsister.com",
      recipients: recipients.length,
      sample: recipients.slice(0, 5),
      batches: batches.length,
    });
  }

  // SCHEDULE – persist to KV queue (a cron/route can consume later)
  if (scheduleAt) {
    const when = new Date(scheduleAt);
    if (Number.isNaN(+when)) {
      return NextResponse.json({ error: "invalid scheduleAt" }, { status: 400 });
    }
    await kv.zadd("nl:schedule", {
      score: when.getTime(),
      member: JSON.stringify({ subject, html, when: when.toISOString() }),
    });
    return NextResponse.json({
      ok: true,
      scheduled: true,
      scheduleAt: when.toISOString(),
      recipients: recipients.length,
    });
  }

  // SEND NOW
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!resendKey) return NextResponse.json({ error: "missing RESEND_API_KEY" }, { status: 500 });

  const resend = new Resend(resendKey);

  let sent = 0;
  const details: Array<{ count: number; ok: boolean; id?: string; error?: string }> = [];

  for (const batch of batches) {
    const resp = await resend.emails.send({
      from: "admin@heyskolsister.com",
      to: batch,
      subject,
      html,
    });
    const ok = !resp.error;
    if (ok) sent += batch.length;

    details.push({
      count: batch.length,
      ok,
      id: resp.data?.id,
      error: resp.error?.message,
    });
  }

  return NextResponse.json({
    ok: true,
    subject,
    from: "admin@heyskolsister.com",
    recipients: recipients.length,
    batches: batches.length,
    sent,
    failedBatches: details.filter((d) => !d.ok).length,
    details,
  });
}
