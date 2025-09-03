// app/api/admin/analytics/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PlausibleAggResponse = {
  results?: Record<string, { value?: number } | number>;
};

function jsonOrText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period =
    url.searchParams.get("period") ?? "30d";
  const metrics =
    url.searchParams.get("metrics") ??
    "visitors,pageviews,bounce_rate,visit_duration";

  const API_BASE = (process.env.PLAUSIBLE_API_BASE ?? "https://plausible.io").replace(/\/+$/, "");
  const API_KEY = process.env.PLAUSIBLE_API_KEY;

  const SITE_ID =
    process.env.PLAUSIBLE_SITE_ID ??
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ??
    (process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
      : "");

  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, error: "PLAUSIBLE_API_KEY not set" },
      { status: 500 }
    );
  }
  if (!SITE_ID) {
    return NextResponse.json(
      { ok: false, error: "PLAUSIBLE_SITE_ID not set" },
      { status: 500 }
    );
  }

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
      return NextResponse.json(
        { ok: false, error: "plausible_error", status: res.status, detail: jsonOrText(text) },
        { status: 502 }
      );
    }

    const data = jsonOrText(text) as PlausibleAggResponse;

    // Flatten { value } objects into plain numbers
    const flat: Record<string, number> = {};
    if (data?.results && typeof data.results === "object") {
      for (const [k, v] of Object.entries(data.results)) {
        if (typeof v === "number") flat[k] = v;
        else if (v && typeof (v as any).value === "number") flat[k] = (v as any).value;
      }
    }

    return NextResponse.json({ ok: true, results: flat }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "proxy_failed", message: e?.message || String(e) },
      { status: 502 }
    );
  }
}
