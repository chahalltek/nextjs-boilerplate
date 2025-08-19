import type { UserRoster, WeeklyLineup, SlotKey, AdminOverrides } from "./types";

/** Fetch Sleeper projections for the week (PPR points) */
async function fetchProjections(week: number) {
  const year = new Date().getFullYear();
  const url = `https://api.sleeper.app/projections/nfl/${year}/${week}?season_type=regular`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("projections fetch failed");
  const rows = await res.json();
  const points: Record<string, number> = {};
  for (const r of rows) points[r.player_id] = r.stats?.pts_ppr || 0;
  return points;
}

/** Fetch player metadata (injury + position) once per build */
async function fetchPlayersMeta() {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl", { cache: "force-cache" });
  const all = await res.json();
  // all[player_id] = { position, team, injury_status, ... }
  return all as Record<string, any>;
}

function eligiblePositions(position: string): SlotKey[] {
  if (position === "QB") return ["QB"];
  if (position === "RB") return ["RB", "FLEX"];
  if (position === "WR") return ["WR", "FLEX"];
  if (position === "TE") return ["TE", "FLEX"];
  if (position === "K")  return ["K"];
  if (position === "DEF")return ["DST"];
  return []; // ignore IDP etc for MVP
}

export async function computeLineup(
  roster: UserRoster,
  week: number,
  overrides?: AdminOverrides
): Promise<WeeklyLineup> {
  const [proj, meta] = await Promise.all([fetchProjections(week), fetchPlayersMeta()]);

  // Build candidate list with adjusted points
  const scored = roster.players.map(pid => {
    const m = meta[pid] || {};
    const base = proj[pid] ?? 0;
    // Simple injury penalty MVP
    let adj = base;
    const inj = m.injury_status?.toUpperCase();
    if (inj === "OUT") adj = -9999;
    else if (inj === "DOUBTFUL") adj -= 5;
    else if (inj === "QUESTIONABLE") adj -= 2;

    // Admin deltas
    const delta = overrides?.pointDelta?.[pid] ?? 0;
    adj += delta;

    return { id: pid, position: m.position, adjusted: adj };
  }).filter(x => eligiblePositions(x.position).length);

  // Apply forceSit by nuking score
  const forceSit = overrides?.forceSit || {};
  for (const c of scored) if (forceSit[c.id]) c.adjusted = -9999;

  // Sort by adjusted desc
  scored.sort((a,b) => b.adjusted - a.adjusted);

  // Greedy fill: required slots first, then FLEX
  const slots: Record<SlotKey, string[]> = { QB:[], RB:[], WR:[], TE:[], FLEX:[], DST:[], K:[] };
  const taken = new Set<string>();
  const need: Record<SlotKey, number> = { ...roster.rules };

  const forceStart = overrides?.forceStart || {};
  // Put forced starters first where eligible
  for (const pid of Object.keys(forceStart)) {
    if (!forceStart[pid]) continue;
    const m = (await fetchPlayersMeta())[pid] || {};
    const elig = eligiblePositions(m.position);
    for (const s of elig) {
      if ((need[s] ?? 0) > (slots[s]?.length ?? 0)) {
        slots[s].push(pid);
        taken.add(pid);
        break;
      }
    }
  }

  function tryPlace(pid: string, pos: string) {
    for (const s of eligiblePositions(pos)) {
      if ((need[s] ?? 0) > (slots[s]?.length ?? 0)) {
        slots[s].push(pid);
        return true;
      }
    }
    return false;
  }

  for (const c of scored) {
    if (taken.has(c.id)) continue;
    if (c.adjusted <= -9999) continue;
    if (tryPlace(c.id, c.position)) taken.add(c.id);
  }

  // Bench = remaining
  const bench = roster.players.filter(p => !taken.has(p));

  const scores: Record<string, number> = {};
  for (const c of scored) scores[c.id] = c.adjusted;

  return { week, slots, bench, scores };
}
