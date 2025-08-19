// app/api/cron/backfill-lineup-names/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Key helpers (match your store.ts scheme)
const kRoster = (id: string) => `ro:roster:${id}`;
const kLineup = (id: string, week: number) => `ro:lineup:${id}:${week}`;
const kLineupNames = (id: string, week: number) => `ro:lineup:names:${id}:${week}`;

type NameHit = { id: string; name?: string; pos?: string; team?: string };

// ---------- utilities ----------
async function fetchNames(ids: string[], origin: string) {
  if (!ids.length) return {};
  // call your existing names endpoint in batches to be safe
  const chunk = (a: string[], n = 60) =>
    Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

  const out: Record<string, { name?: string; pos?: string; team?: string }> = {};
  for (const group of chunk(ids, 60)) {
    const url = `${origin}/api/players/names?ids=${encodeURIComponent(group.join(","))}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json().catch(() => [])) as NameHit[];
      for (const h of data || []) {
        if (!h?.id) continue;
        out[h.id] = { name: h.name, pos: h.pos, team: h.team };
      }
    } catch {
      // ignore chunk errors; proceed with what we have
    }
  }
  return out;
}

function uniqueIdsFromLineup(lineup: any): string[] {
  const slots = lineup?.slots || {};
  const bench = lineup?.bench || [];
  const slotIds = Object.values(slots).flat().filter(Boolean) as string[];
  return Array.from(new Set([...slotIds, ...bench]));
}

async function saveNameMap(rosterId: string, week: number, map: Record<string, any>) {
  // TTL ~ 14 days; adjust as you wish
  await kv.set(kLineupNames(rosterId, week), map, { ex: 60 * 60 * 24 * 14 });
}

// Scan all roster ids in KV (keys look like "ro:roster:<id>")
async function getAllRosterIds(): Promise<string[]> {
  const out: string[] = [];
  for await (const key of kv.scanIterator({ match: "ro:roster:*", count: 500 })) {
    const m = /^ro:roster:(.+)$/.exec(String(key));
    if (m?.[1]) out.push(m[1]);
  }
  return out;
}

// ---------- handler ----------
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  const week = Number(searchParams.get("week") || "0");
  const all = searchParams.get("all") === "1";

  if ((!id && !all) || !Number.isFinite(week) || week <= 0) {
    return NextResponse.json({ ok: false, error: "id or all=1 required, and valid week required" }, { status: 400 });
  }

  // figure out origin for internal fetches
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (typeof req.headers.get === "function" && (req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
      : "")) ||
    "";

  try {
    const targetIds = id ? [id] : await getAllRosterIds();

    let processed = 0;
    let skipped = 0;

    for (const rid of targetIds) {
      const lu = await kv.get(kLineup(rid, week));
      if (!lu) { skipped++; continue; }

      const ids = uniqueIdsFromLineup(lu);
      if (!ids.length) { skipped++; continue; }

      const nameMap = await fetchNames(ids, origin || "");
      await saveNameMap(rid, week, nameMap);
      processed++;
    }

    return NextResponse.json({ ok: true, processed, skipped, week, mode: id ? "single" : "bulk" });
  } catch (e) {
    console.error("backfill-lineup-names fatal:", e);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}

// Optional GET for quick manual runs
export async function GET(req: Request) {
  return POST(req);
}
