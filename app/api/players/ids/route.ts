// app/api/players/ids/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Lite = { name?: string; pos?: string; team?: string };
type MapOut = Record<string, Lite>;

const SLEEPER_URL = "https://api.sleeper.app/v1/players/nfl";
const STALE_MS = 1000 * 60 * 60 * 6; // 6h

// Lambda-scoped cache (persists across warm invocations)
let CACHE: { byId: MapOut; loadedAt: number } | null = null;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "ids required" }, { status: 400 });
  }

  try {
    const byId = await getPlayersIndex();
    const map: MapOut = {};
    for (const id of ids) {
      const p = byId[id];
      if (p) map[id] = p;
    }
    return NextResponse.json({ ok: true, map });
  } catch (err) {
    console.error("players/ids error", err);
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }
}

async function getPlayersIndex(): Promise<MapOut> {
  // serve from cache if fresh
  if (CACHE && Date.now() - CACHE.loadedAt < STALE_MS) return CACHE.byId;

  // fetch all NFL players from Sleeper (object keyed by player_id)
  const res = await fetch(SLEEPER_URL, {
    // cache the upstream response for a bit; your lambda still has its own CACHE too
    // @ts-ignore-next-line – `next` is fine in app routes
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!res.ok) throw new Error(`Sleeper fetch failed: ${res.status}`);
  const data = await res.json();

  // Build a compact index: id -> { name, pos, team }
  const byId: MapOut = {};
  for (const [pid, raw] of Object.entries<any>(data)) {
    const name =
      raw.full_name ||
      [raw.first_name, raw.last_name].filter(Boolean).join(" ") ||
      raw.search_full_name ||
      raw.last_name ||
      String(pid);

    const pos = raw.position || (Array.isArray(raw.fantasy_positions) ? raw.fantasy_positions[0] : undefined);
    // Sleeper uses team code (e.g., "MIN"); try multiple fields just in case
    const team = raw.team || raw.active_team || raw.team_abbr || raw.metadata?.team_abbr;

    byId[pid] = { name, pos, team };
  }

  CACHE = { byId, loadedAt: Date.now() };
  return byId;
}
