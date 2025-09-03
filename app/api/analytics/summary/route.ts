// app/api/analytics/summary/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Config (env) */
const API_BASE = process.env.PLAUSIBLE_API_BASE || "https://plausible.io";
const API = `${API_BASE.replace(/\/$/, "")}/api/v1/stats/aggregate`;

// Option A: private API key (recommended)
const KEY = process.env.PLAUSIBLE_API_KEY || "";

// Option B: public “share” secret (Plausible → Share → Enable shared link)
const SHARED = process.env.PLAUSIBLE_SHARED_LINK || "";

// Required
const SITE_ID =
  process.env.PLAUSIBLE_SITE_ID ||
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || // fallback if you set only this
  new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://heyskolsister.com").host;

type FetchErr = { status?: number; body?: string; message?: string };

async function safeText(res: Response) {
  try { return await res.text(); } catch { return ""; }
}

async function callPlausible(params: Record<string, string>) {
  const url = new URL(API);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (SHARED && !KEY) url.searchParams.set("auth", SHARED);

  const tries = [0, 500, 1200]; // backoff (ms) for 5xx/429
  let lastErr: FetchErr | undefined;

  for (const delay of tries) {
    if (delay) await new Promise(r => setTimeout(r, delay));

    try {
      const res = await fetch(url.toString(), {
        headers: KEY ? { Authorization: `Bearer ${KEY}` } : undefined,
        cache: "no-store",
      });

      if (res.ok) return { ok: true as const, data: await res.json() };

      const body = await safeText(res);
      // retry on transient
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        lastErr = { status: res.status, body };
        continue;
      }
      // permanent error
      return { ok: false as const, error: { status: res.status, body } };
    } catch (e: any) {
      lastErr = { message: e?.message || String(e) };
    }
  }
  return { ok: false as const, error: lastErr || { status: 503, body: "Service unavailable" } };
}

/** tiny in-proc cache so brief outages don’t break UI */
let lastOk: { asOf: number; payload: any } | null = null;

export async function GET(req: Request) {
  if (!SITE_ID) {
    return NextResponse.json({ error: "Missing SITE_ID" }, { status: 500 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "30d";
  const metrics =
    url.searchParams.get("metrics") ||
    "visitors,pageviews,bounce_rate,visit_duration";

  const result = await callPlausible({ site_id: SITE_ID, period, metrics });

  if (result.ok) {
    lastOk = { asOf: Date.now(), payload: result.data };
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // Serve last good payload if available
  if (lastOk) {
    console.warn("[analytics] serving cached due to error:", result.error);
    return NextResponse.json(
      { ...lastOk.payload, _staleAsOf: lastOk.asOf },
      { headers: { "X-From-Cache": "1" } },
    );
  }

  const status =
    typeof result.error?.status === "number" ? result.error.status : 502;
  console.error("[analytics] Plausible error:", result.error);
  return NextResponse.json(
    { error: "Plausible API error", details: result.error },
    { status },
  );
}
