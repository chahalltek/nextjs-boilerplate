// app/api/analytics/summary/route.ts
import { NextResponse } from "next/server";

const API = "https://plausible.io/api/v1/stats/aggregate";
const KEY = process.env.PLAUSIBLE_API_KEY!;
const SITE_ID = process.env.PLAUSIBLE_SITE_ID || process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

// simple in-process cache so brief outages don’t break the UI
let lastOk: { asOf: number; payload: any } | null = null;

async function fetchAgg(params: Record<string, string>) {
  const url = new URL(API);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  // minimal exponential backoff on 429/5xx
  const tries = [0, 500, 1200];
  let lastErr: any;

  for (const delay of tries) {
    if (delay) await new Promise(r => setTimeout(r, delay));
    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${KEY}` },
        // don’t let edge cache a 503
        cache: "no-store",
      });

      if (res.ok) return { ok: true as const, data: await res.json() };

      // retry on transient errors
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        lastErr = { status: res.status, body: await safeText(res) };
        continue;
      }

      // non-retryable error
      return { ok: false as const, error: { status: res.status, body: await safeText(res) } };
    } catch (e: any) {
      lastErr = e;
    }
  }

  return { ok: false as const, error: lastErr ?? { status: 503, body: "Service unavailable" } };
}

async function safeText(res: Response) {
  try { return await res.text(); } catch { return ""; }
}

export async function GET(req: Request) {
  if (!KEY || !SITE_ID) {
    return NextResponse.json(
      { error: "Missing PLAUSIBLE_API_KEY or PLAUSIBLE_SITE_ID" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "30d";
  const metrics = url.searchParams.get("metrics")
    || "visitors,pageviews,bounce_rate,visit_duration";

  const result = await fetchAgg({ site_id: SITE_ID, period, metrics });

  if (result.ok) {
    lastOk = { asOf: Date.now(), payload: result.data };
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // Serve last good data if we have it
  if (lastOk) {
    return NextResponse.json(
      { ...lastOk.payload, _staleAsOf: lastOk.asOf },
      { headers: { "X-From-Cache": "1" } },
    );
  }

  // Otherwise bubble the error with context
  const status = typeof result.error?.status === "number" ? result.error.status : 502;
  return NextResponse.json(
    { error: "Plausible API error", details: result.error },
    { status },
  );
}
