import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import Resend from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function okAuth(req: NextRequest) {
  const h = req.headers;
  const bearer = (h.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const alt = h.get("x-admin-key") || "";
  const expected = process.env.ADMIN_API_KEY || "";
  return expected && (bearer === expected || alt === expected);
}

function getBaseUrl(req: NextRequest) {
  // Prefer explicit public site URL, then Vercel host, then headers
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host =
    process.env.VERCEL_URL ||
    h.get("x-forwarded-host") ||
    h.get("host") ||
    "localhost:3000";
  return `${proto}://${host.replace(/\/+$/, "")}`;
}

async function fetchRecipients(req: NextRequest): Promise<string[]> {
  const base = getBaseUrl(req);
  const key = process.env.ADMIN_API_KEY || "";
  const url = `${base}/api/admin/newsletter/recipients`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${key}`,
      accept: "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`recipients fetch failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return Array.isArray(json?.recipients) ? json.recipients : [];
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  if (!okAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const resendKey = process.env.RESEND_API_KEY || "";
  const from = process.env.RESEND_FROM || "Hey Skol Sister <team@heyskolsister.com>";

  // Body is what your admin page already posts
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }
  const subject: string = body?.subject || "";
  const html: string = body?.html || body?.markup || "";
  const text: string | undefined = body?.text;

  if (!subject || !html) {
    return NextResponse.json(
      { ok: false, error: "missing_subject_or_html" },
      { status: 400 }
    );
  }

  let recipients: string[] = [];
  try {
    recipients = await fetchRecipients(req);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "recipients_failed", detail: e?.message || String(e) },
      { status: 502 }
    );
  }

  if (!recipients.length) {
    return NextResponse.json(
      { ok: false, error: "no_recipients", recipients: 0 },
      { status: 400 }
    );
  }

  // Dry run returns what *would* be sent
  if (dry) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      subject,
      from,
      recipients: recipients.length,
      sample: recipients.slice(0, 5),
      batches: Math.ceil(recipients.length / 90),
    });
  }

  if (!resendKey) {
    return NextResponse.json(
      { ok: false, error: "missing_RESEND_API_KEY" },
      { status: 500 }
    );
  }

  const resend = new Resend(resendKey);

  // Resend supports batch send; keep batch size modest (<=100)
  const batches = chunk(recipients, 90);
  const results: Array<{ count: number; ok: boolean; ids?: string[]; error?: string }> = [];

  for (const emails of batches) {
    try {
      // prefer batch endpoint to reduce API calls
      const resp = await resend.emails.batch.send({
        emails: emails.map((to) => ({
          from,
          to,
          subject,
          html,
          text,
        })),
      });

      // resp is array of results
      const ids = Array.isArray(resp) ? resp.map((r: any) => r?.id).filter(Boolean) : [];
      results.push({ count: emails.length, ok: true, ids });
    } catch (e: any) {
      results.push({
        count: emails.length,
        ok: false,
        error: e?.message || String(e),
      });
    }
  }

  const sent = results.filter((r) => r.ok).reduce((n, r) => n + (r.count || 0), 0);
  const failedBatches = results.filter((r) => !r.ok);

  const response = {
    ok: failedBatches.length === 0 && sent > 0,
    subject,
    from,
    recipients: recipients.length,
    batches: batches.length,
    sent,
    failedBatches: failedBatches.length,
    details: results.slice(0, 3), // trim payload
  };

  // If nothing actually queued, respond 502 to force UI to show a failure.
  const status = response.ok ? 200 : 502;
  return NextResponse.json(response, { status });
}
