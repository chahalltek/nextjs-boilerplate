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

export async function GET(_req: NextRequest) {
  if (!KEY || !LIST || !DC) {
    return Response.json(
      { ok: false, error: "Missing Mailchimp env (MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_SERVER_PREFIX)" },
      { status: 500 }
    );
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
