// app/api/admin/analytics/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseJsonOrWrap(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getSiteId(): string | null {
  const envSite =
    process.env.PLAUSIBLE_SITE_ID ||
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ||
    "";

  if (envSite) return envSite.trim();

  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return null;

  try {
    return new URL(base).host;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period =
    url.searchParams.get("period") || "30d";
  const metrics =
    url.searchParams.get("metrics") ||
    "visitors,pageviews,bounce_rate,visit_duration";

  const API_BASE =
    (process.env.PLAUSIBLE_API_BASE || "https://plausible.io").replace(/\/+$/, "");
  const API_KEY = process.env.PLAUSIBLE_API_KEY || "";
  const SITE_ID = getSiteId();

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Missing env: PLAUSIBLE_API_KEY" },
      { status: 500 }
    );
  }
  if (!SITE_ID) {
    return NextResponse.json(
      {
        error:
          "Missing site id. Set PLAUSIBLE_SITE_ID or NEXT_PUBLIC_PLAUSIBLE_DOMAIN, or provide NEXT_PUBLIC_SITE_URL so we can derive the host.",
      },
      { status: 500 }
    );
  }

  const endpoint =
    `${API_BASE}/api/v1/stats/aggregate` +
    `?site_id=${encodeURIComponent(SITE_ID)}` +
    `&period=${encodeURIComponent(period)}` +
    `&metrics=${encodeURIComponent(metrics)}`;

  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      // Pass through Plausible status so the UI can display it
      return NextResponse.json(
        {
          error: "plausible_error",
          status: res.status,
          detail: parseJsonOrWrap(text),
        },
        { status: res.status }
      );
    }

    // Plausible returns `{ results: { ... } }`
    return NextResponse.json(parseJsonOrWrap(text), { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", message: e?.message || String(e) },
      { status: 502 }
    );
  }
}
