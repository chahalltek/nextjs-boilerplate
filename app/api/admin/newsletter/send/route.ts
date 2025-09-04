import { NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";

/* -------------------- small utils -------------------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function domainOf(email: string) {
  return (email.split("@")[1] || "").toLowerCase();
}

// very simple html -> text fallback (good enough for newsletters)
function htmlToTextSimple(html: string) {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

/* -------------------- handler -------------------- */
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

  /* ---------- DRY RUN ---------- */
  if (dry) {
    const batches = chunk(recipients, 90);
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

  /* ---------- SCHEDULE ---------- */
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

  /* ---------- SEND NOW (paced) ---------- */
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!resendKey) return NextResponse.json({ error: "missing RESEND_API_KEY" }, { status: 500 });

  const resend = new Resend(resendKey);

  const from = "admin@heyskolsister.com";
  const unsubBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://heyskolsister.com");
  const listUnsub = `<mailto:unsubscribe@heyskolsister.com?subject=unsubscribe>, <${unsubBase}/unsubscribe?e={{recipient}}>`;
  const headers = {
    "List-Unsubscribe": listUnsub,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "Precedence": "bulk",
  } as Record<string, string>;

  const textAlt = htmlToTextSimple(html);

  const gmail = recipients.filter((r) => {
    const d = domainOf(r);
    return d === "gmail.com" || d === "googlemail.com";
  });
  const other = recipients.filter((r) => !gmail.includes(r));

  let sent = 0;
  let failed = 0;
  let deferredHints = 0;

  type Detail = { to: string; ok: boolean; id?: string; error?: string };
  const details: Detail[] = [];

  // Pace Gmail more strictly (e.g., ~5s)
  for (const to of gmail) {
    try {
      const resp = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text: textAlt,
        headers,
      });
      const ok = !resp.error;
      if (ok) sent += 1;
      else failed += 1;

      const errMsg = resp.error?.message || "";
      if (/4\.7\.28|421 4\.7\.28|rate limited/i.test(errMsg)) deferredHints += 1;

      details.push({ to, ok, id: resp.data?.id, error: errMsg || undefined });
    } catch (e: any) {
      failed += 1;
      const msg = String(e?.message || "");
      if (/4\.7\.28|421 4\.7\.28|rate limited/i.test(msg)) deferredHints += 1;
      details.push({ to, ok: false, error: msg });
    }
    await sleep(5000); // Gmail pacing
  }

  // Others: a little faster pace
  for (const to of other) {
    try {
      const resp = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text: textAlt,
        headers,
      });
      const ok = !resp.error;
      if (ok) sent += 1;
      else failed += 1;

      const errMsg = resp.error?.message || "";
      if (/4\.7\.28|421 4\.7\.28|rate limited/i.test(errMsg)) deferredHints += 1;

      details.push({ to, ok, id: resp.data?.id, error: errMsg || undefined });
    } catch (e: any) {
      failed += 1;
      const msg = String(e?.message || "");
      if (/4\.7\.28|421 4\.7\.28|rate limited/i.test(msg)) deferredHints += 1;
      details.push({ to, ok: false, error: msg });
    }
    await sleep(1200);
  }

  // NOTE: Resend returns immediately after queueing; true Gmail "deferrals" show up in events.
  // We surface any hint we caught synchronously but still return ok=true so the admin UI doesn't treat as a hard failure.
  return NextResponse.json({
    ok: true,
    subject,
    from,
    recipients: recipients.length,
    gmailPaced: gmail.length,
    otherPaced: other.length,
    sent,
    failed,
    deferredHints, // count of responses that looked like Gmail rate limiting
    details,
  });
}
