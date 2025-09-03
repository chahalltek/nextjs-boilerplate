// app/api/admin/mailchimp/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerOk(req: Request) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return true; // no lock if not configured
  const hdr = req.headers.get("authorization") || "";
  return hdr === `Bearer ${key}`;
}

function mcAuthHeader(apiKey: string) {
  // Mailchimp uses HTTP Basic; username can be anything
  const b64 = Buffer.from(`anystring:${apiKey}`).toString("base64");
  return `Basic ${b64}`;
}

export async function GET(req: Request) {
  if (!bearerOk(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const API_KEY = process.env.MAILCHIMP_API_KEY || "";
  const SERVER  = process.env.MAILCHIMP_SERVER_PREFIX || ""; // e.g. "us17"
  const LIST_ID = process.env.MAILCHIMP_LIST_ID || "";

  if (!API_KEY || !SERVER || !LIST_ID) {
    return NextResponse.json(
      { ok: false, error: "Missing Mailchimp env (MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_SERVER_PREFIX)" },
      { status: 500 }
    );
  }

  const BASE = `https://${SERVER}.api.mailchimp.com/3.0`;
  const headers = { Authorization: mcAuthHeader(API_KEY) };

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [listRes, recentRes, growthRes] = await Promise.all([
      // List metadata + stats
      fetch(`${BASE}/lists/${encodeURIComponent(LIST_ID)}`, { headers, cache: "no-store" }),
      // Most recent signups
      fetch(
        `${BASE}/lists/${encodeURIComponent(LIST_ID)}/members?count=10&sort_field=timestamp_opt&sort_dir=DESC`,
        { headers, cache: "no-store" }
      ),
      // Growth (new subscribed in last 30 days)
      fetch(
        `${BASE}/lists/${encodeURIComponent(LIST_ID)}/members?count=0&status=subscribed&since_timestamp_opt=${encodeURIComponent(
          sinceIso
        )}`,
        { headers, cache: "no-store" }
      ),
    ]);

    if (!listRes.ok) {
      const text = await listRes.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `List fetch failed: ${text}` }, { status: 502 });
    }

    const listJson   = await listRes.json();
    const recentJson = recentRes.ok ? await recentRes.json() : { members: [] };
    const growthJson = growthRes.ok ? await growthRes.json() : { total_items: undefined };

    const total = listJson?.stats?.member_count ?? listJson?.member_count ?? 0;
    const unsub = listJson?.stats?.unsubscribe_count ?? listJson?.stats?.unsubscribed ?? 0;

    const recent = Array.isArray(recentJson?.members)
      ? recentJson.members.slice(0, 10).map((m: any) => ({
          email: m?.email_address,
          status: m?.status,
          ts: m?.timestamp_opt ?? m?.timestamp_signup ?? m?.last_changed,
        }))
      : [];

    const growth30d =
      typeof growthJson?.total_items === "number" ? (growthJson.total_items as number) : undefined;

    return NextResponse.json({
      ok: true,
      list_name: listJson?.name,
      total_subscribers: total,
      unsubscribes: unsub,
      growth_30d: growth30d,
      recent_signups: recent,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
