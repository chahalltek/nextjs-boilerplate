// app/api/admin/analytics/route.ts
import { NextResponse } from "next/server";

function jsonOrText(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period  = url.searchParams.get("period")  || "30d";
  const metrics = url.searchParams.get("metrics") || "visitors,pageviews,bounce_rate,visit_duration";

  const API_BASE = process.env.PLAUSIBLE_API_BASE?.replace(/\/+$/, "") || "https://plausible.io";
  const API_KEY  = process.env.PLAUSIBLE_API_KEY;
  const SITE_ID  =
    process.env.PLAUSIBLE_SITE_ID ||
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ||
    (process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : "");

  if (!API_KEY) {
    return NextResponse.json({ error: "PLAUSIBLE_API_KEY not set" }, { status: 500 });
  }
  if (!SITE_ID) {
    return NextResponse.json({ error: "PLAUSIBLE_SITE_ID not set" }, { status: 500 });
  }

  // Keep it simple: aggregate (totals) and timeseries in two calls if you want.
  const endpoint = `${API_BASE}/api/v1/stats/aggregate?site_id=${encodeURIComponent(
    SITE_ID
  )}&period=${encodeURIComponent(period)}&metrics=${encodeURIComponent(metrics)}`;

  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      // Bubble Plausible’s error with status so the UI can show it
      return NextResponse.json(
        { error: "plausible_error", status: res.status, detail: jsonOrText(text) },
        { status: 502 }
      );
    }

    return NextResponse.json(jsonOrText(text), { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_failed", message: e?.message || String(e) }, { status: 502 });
  }
}
