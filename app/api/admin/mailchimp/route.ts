// app/api/admin/mailchimp/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // we use Buffer for Basic auth

function inferServerPrefix(key?: string, fallback?: string) {
  if (fallback) return fallback.replace(/^\s+|\s+$/g, "");
  const m = /-([a-z0-9]+)$/i.exec(key || "");
  return m ? m[1] : undefined;
}

function authHeader(key: string) {
  // Mailchimp uses HTTP Basic; username can be anything
  const token = Buffer.from(`anystring:${key}`).toString("base64");
  return `Basic ${token}`;
}

export async function GET() {
  const API_KEY = process.env.MAILCHIMP_API_KEY || "";
  let SERVER_PREFIX = inferServerPrefix(API_KEY, process.env.MAILCHIMP_SERVER_PREFIX);
  let LIST_ID = process.env.MAILCHIMP_LIST_ID || "";
  const LIST_NAME = process.env.MAILCHIMP_LIST_NAME || ""; // optional convenience

  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing MAILCHIMP_API_KEY" },
      { status: 500 }
    );
  }

  if (!SERVER_PREFIX) {
    return NextResponse.json(
      { ok: false, error: "Missing MAILCHIMP_SERVER_PREFIX (and could not infer from API key)" },
      { status: 500 }
    );
  }

  const BASE = `https://${SERVER_PREFIX}.api.mailchimp.com/3.0`;
  const headers = { Authorization: authHeader(API_KEY) };

  // If no LIST_ID, try to discover one (by name first, else first list)
  if (!LIST_ID) {
    const res = await fetch(
      `${BASE}/lists?count=100&fields=lists.id,lists.name,total_items`,
      { headers, cache: "no-store" }
    );
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "List discovery failed", detail: json },
        { status: 502 }
      );
    }
    const lists: Array<{ id: string; name: string }> = json?.lists || [];
    const byName =
      LIST_NAME &&
      lists.find(
        (l) => l.name?.toLowerCase().trim() === LIST_NAME.toLowerCase().trim()
      );
    LIST_ID = (byName || lists[0])?.id || "";
    if (!LIST_ID) {
      return NextResponse.json(
        { ok: false, error: "No lists found. Set MAILCHIMP_LIST_ID or create a list." },
        { status: 500 }
      );
    }
  }

  // Helper to count items via total_items without pulling the whole list
  const count = async (url: string) => {
    const r = await fetch(url, { headers, cache: "no-store" });
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) throw new Error(`Mailchimp ${r.status}: ${JSON.stringify(j)}`);
    return Number(j?.total_items ?? 0);
  };

  const sinceISO = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  try {
    const [metaRes, total, unsub, growth30d] = await Promise.all([
      fetch(`${BASE}/lists/${LIST_ID}?fields=name`, { headers, cache: "no-store" }),
      count(`${BASE}/lists/${LIST_ID}/members?count=0`),
      count(`${BASE}/lists/${LIST_ID}/members?status=unsubscribed&count=0`),
      count(
        `${BASE}/lists/${LIST_ID}/members?status=subscribed&since_timestamp_opt=${encodeURIComponent(
          sinceISO
        )}&count=0`
      ),
    ]);

    const meta = await metaRes.json().catch(() => ({} as any));
    if (!metaRes.ok) {
      return NextResponse.json(
        { ok: false, error: "List metadata fetch failed", detail: meta },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        list_id: LIST_ID,
        list_name: meta?.name,
        total_subscribers: total,
        unsubscribes: unsub,
        growth_30d: growth30d,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 502 }
    );
  }
}
