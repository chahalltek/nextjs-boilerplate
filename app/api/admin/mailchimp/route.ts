// app/api/admin/mailchimp/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY   = process.env.MAILCHIMP_API_KEY!;
const LIST  = process.env.MAILCHIMP_LIST_ID!;
const DC    = process.env.MAILCHIMP_SERVER_PREFIX!; // e.g. "us21"

function authHeader() {
  // Mailchimp uses HTTP Basic auth: any user, API key as password
  const token = Buffer.from(`anystring:${KEY}`).toString("base64");
  return `Basic ${token}`;
}

function btoaNode(s: string) {
  return Buffer.from(s, "utf8").toString("base64");
}

export async function GET() {
  const API_KEY =
    process.env.MAILCHIMP_API_KEY || process.env.MC_API_KEY || "";
  const LIST_ID =
    process.env.MAILCHIMP_LIST_ID || process.env.MC_LIST_ID || "";

  // Accept explicit DC, otherwise derive from API key suffix "-us21"
  let DC =
    process.env.MAILCHIMP_SERVER_PREFIX ||
    process.env.MAILCHIMP_DC ||
    "";

  if (!DC && API_KEY) {
    const m = API_KEY.match(/-([a-z]+\d+)$/i);
    if (m) DC = m[1];
  }

  if (!API_KEY || !LIST_ID || !DC) {
    return Response.json(
      {
        ok: false,
        error:
          "Missing Mailchimp env (MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, and either MAILCHIMP_SERVER_PREFIX/MAILCHIMP_DC or a key that ends with -usXX).",
      },
      { status: 500 }
    );
  }

  try {
    const url = `https://${DC}.api.mailchimp.com/3.0/lists/${encodeURIComponent(
      LIST_ID
    )}?fields=stats.member_count,stats.unsubscribe_count,stats.cleaned_count,total_items,member_count`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${btoaNode(`any:${API_KEY}`)}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return Response.json(
        { ok: false, status: res.status, error: txt || "Mailchimp API error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const stats = data?.stats || {};

    const total =
      Number(data?.member_count ?? stats?.member_count ?? 0) || 0;
    const unsub = Number(stats?.unsubscribe_count ?? 0) || 0;

    return Response.json({
      ok: true,
      contacts: total,
      subscribed: Math.max(0, total - unsub),
      unsubscribed: unsub,
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

  const base = `https://${DC}.api.mailchimp.com/3.0`;

  try {
    const [listRes, membersRes, growthRes] = await Promise.all([
      fetch(`${base}/lists/${LIST}`, {
        headers: { Authorization: authHeader() },
        cache: "no-store",
      }),
      fetch(`${base}/lists/${LIST}/members?count=10&sort_field=timestamp_opt&sort_dir=DESC`, {
        headers: { Authorization: authHeader() },
        cache: "no-store",
      }),
      fetch(`${base}/lists/${LIST}/growth-history?count=12`, {
        headers: { Authorization: authHeader() },
        cache: "no-store",
      }),
    ]);

    if (!listRes.ok) {
      const text = await listRes.text();
      return Response.json({ ok: false, error: `List fetch failed: ${text}` }, { status: 502 });
    }

    const listJson    = await listRes.json();
    const membersJson = membersRes.ok ? await membersRes.json() : { members: [] };
    const growthJson  = growthRes.ok ? await growthRes.json() : { history: [] };

    const total = listJson?.stats?.member_count ?? 0;
    const unsub = listJson?.stats?.unsubscribe_count ?? 0;

    // Compute simple 30d growth from growth-history (Mailchimp returns monthly points)
    const history = (growthJson?.history ?? []) as Array<{ month: string; existing: number; }>;
    const lastTwo = history.slice(-2);
    const growth30d =
      lastTwo.length === 2 ? (lastTwo[1].existing ?? 0) - (lastTwo[0].existing ?? 0) : 0;

    const recent = (membersJson?.members ?? []).map((m: any) => ({
      email: m?.email_address,
      status: m?.status, // subscribed, cleaned, unsubscribed
      ts: m?.timestamp_opt ?? m?.timestamp_signup ?? m?.last_changed,
    }));

    return Response.json({
      ok: true,
      list_name: listJson?.name,
      total_subscribers: total,
      unsubscribes: unsub,
      growth_30d: growth30d,
      recent_signups: recent,
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
