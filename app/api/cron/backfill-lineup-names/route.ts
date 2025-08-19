// app/api/cron/backfill-lineup-names/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
// If you already have helpers to load lineups, use them:
import { getLineup } from "@/lib/roster/store";

// ---- Config / helpers -------------------------------------------------

/** Where we persist the names map per (roster, week). */
const kLineupNames = (rosterId: string, week: number) =>
  `lineup:names:${rosterId}:${week}`;

/** Parse all ids from a lineup’s slots + bench. */
function collectIds(lineup: any): string[] {
  const ids = new Set<string>();
  if (lineup?.slots && typeof lineup.slots === "object") {
    Object.values(lineup.slots as Record<string, string[]>).forEach((arr) => {
      (arr || []).forEach((pid) => pid && ids.add(String(pid)));
    });
  }
  (lineup?.bench || []).forEach((pid: string) => pid && ids.add(String(pid)));
  return Array.from(ids);
}

/** True if lineup was recommended within lookback window (or no timestamp present). */
function isRecent(lineup: any, cutoffMs: number) {
  if (!lineup) return false;
  const ts = Date.parse(String(lineup.recommendedAt || "")) || 0;
  return ts === 0 || ts >= cutoffMs;
}

/** Fetch name/pos/team for ids via your existing names API. */
async function fetchNamesMap(ids: string[]): Promise<Record<string, any>> {
  if (!ids.length) return {};
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${base}/api/players/names?ids=${encodeURIComponent(ids.join(","))}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, any>;
  } catch {
    return {};
  }
}

/** Try to discover roster ids from KV if caller didn’t specify one. */
async function discoverRosterIds(): Promise<string[]> {
  // We try a couple likely patterns and dedupe; if unavailable, return [].
  const out = new Set<string>();
  try {
    // Common pattern if rosters are stored like "roster:<id>"
    const rosterKeys = await kv.keys<string>("roster:*");
    rosterKeys.forEach((k) => {
      const m = k.match(/^roster:(.+)$/);
      if (m) out.add(m[1]);
    });
  } catch {}
  // If you also keep an index/list somewhere (e.g., "rosters:index"), pull it here:
  try {
    const list = (await kv.get<string[]>("rosters:index")) || [];
    list.forEach((id) => id && out.add(id));
  } catch {}
  return Array.from(out);
}

// ---- Handlers ---------------------------------------------------------

/**
 * POST /api/cron/backfill-lineup-names?days=14[&roster=<id>]
 *
 * - If `roster` is provided, only that roster is scanned (weeks 1..18) and
 *   filtered by `recommendedAt >= now - days`.
 * - Otherwise, we attempt to discover roster ids from KV and scan them.
 * - For every lineup found, we collect unique player_ids, fetch name meta via
 *   /api/players/names, and store the result at KV key:
 *     lineup:names:<rosterId>:<week>
 *
 * Response: { ok, scanned, updated, ids }
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || "14");
  const rosterParam = (url.searchParams.get("roster") || "").trim();

  if (!Number.isFinite(days) || days <= 0) {
    return NextResponse.json(
      { ok: false, error: "Provide a positive ?days=N (e.g., ?days=14)." },
      { status: 400 }
    );
  }

  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  // Build candidate (roster, week) pairs to scan.
  const candidates: Array<{ roster: string; week: number }> = [];

  async function addRosterWeeks(rid: string) {
    // We don't know which weeks exist; probe 1..18 and include if present + recent
    for (let w = 1; w <= 18; w++) {
      try {
        const lu = await getLineup(rid, w);
        if (!lu) continue;
        if (!isRecent(lu, cutoff)) continue;
        candidates.push({ roster: rid, week: w });
      } catch {
        // ignore
      }
    }
  }

  if (rosterParam) {
    await addRosterWeeks(rosterParam);
  } else {
    const rosters = await discoverRosterIds();
    if (rosters.length === 0) {
      // As a fallback, try to infer from lineup:* keys:
      try {
        const keys = await kv.keys<string>("lineup:*"); // e.g., "lineup:<id>:<week>"
        keys.forEach((k) => {
          const m = k.match(/^lineup:(.+?):(\d{1,2})$/);
          if (m) candidates.push({ roster: m[1], week: Number(m[2]) });
        });
      } catch {
        // nothing we can do; return a helpful message
        return NextResponse.json(
          {
            ok: false,
            error:
              "Could not discover roster ids. Pass ?roster=<id> to backfill a single roster.",
          },
          { status: 400 }
        );
      }
      // Filter by recency when we can fetch the lineup
      const filtered: Array<{ roster: string; week: number }> = [];
      for (const c of candidates) {
        try {
          const lu = await getLineup(c.roster, c.week);
          if (lu && isRecent(lu, cutoff)) filtered.push(c);
        } catch {}
      }
      candidates.length = 0;
      candidates.push(...filtered);
    } else {
      // Scan discovered rosters
      for (const rid of rosters) await addRosterWeeks(rid);
    }
  }

  // Load all candidates to gather ids
  const seenPairs = new Set<string>();
  const lineups: Array<{ roster: string; week: number; lu: any }> = [];
  const allIds = new Set<string>();

  for (const c of candidates) {
    const key = `${c.roster}:${c.week}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    try {
      const lu = await getLineup(c.roster, c.week);
      if (!lu) continue;
      const ids = collectIds(lu);
      ids.forEach((id) => allIds.add(id));
      lineups.push({ roster: c.roster, week: c.week, lu });
    } catch {
      // ignore individual failures
    }
  }

  // Fetch names once, then persist per-lineup
  const nameMap = await fetchNamesMap(Array.from(allIds));
  let updated = 0;

  for (const item of lineups) {
    try {
      await kv.set(kLineupNames(item.roster, item.week), nameMap);
      updated++;
    } catch {
      // continue
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    updated,
    ids: allIds.size,
  });
}

// Optional GET wrapper (handy for quick tests)
export const GET = POST;
