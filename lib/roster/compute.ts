import type { UserRoster, WeeklyLineup, AdminOverrides, Position } from "./types";

const CURRENT_YEAR = new Date().getFullYear();

type Proj = { pts_ppr?: number; injury_status?: string; opp_rank?: number };

async function fetchProjectionsMap(week: number): Promise<Record<string, Proj>> {
  const url = `https://api.sleeper.app/projections/nfl/${CURRENT_YEAR}/${week}?season_type=regular`;
  const res = await fetch(url, { cache: "no-store" });
  const rows = await res.json().catch(()=>[]) as any[];
  const out: Record<string, Proj> = {};
  for (const r of rows) out[r.player_id] = { pts_ppr: r.stats?.pts_ppr, injury_status: r.injury_status, opp_rank: r.opponent_rank };
  return out;
}

function tierFrom(points: number): "A"|"B"|"C"|"D" {
  if (points >= 18) return "A";
  if (points >= 12) return "B";
  if (points >= 8)  return "C";
  return "D";
}

function confidence(points: number, injury?: string) {
  let c = Math.max(0, Math.min(1, points / 24));
  if (injury === "OUT" || injury === "Doubtful") c *= 0.1;
  else if (injury === "Questionable") c *= 0.8;
  return Number(c.toFixed(2));
}

export async function computeLineup(
  roster: UserRoster,
  week: number,
  overrides: AdminOverrides = {}
): Promise<WeeklyLineup> {
  const projMap = await fetchProjectionsMap(week);
  const want: Record<Position, number> = { ...roster.rules };

  const details: WeeklyLineup["details"] = {};
  const forcedStart = overrides.forceStart || {};
  const forcedSit   = overrides.forceSit   || {};
  const deltas      = overrides.pointDelta || {};
  const used = new Set<string>();

  // candidate score
  const rows = (roster.players || []).map(pid => {
    const p = projMap[pid] || {};
    let pts = Number(p.pts_ppr || 0) + Number(deltas[pid] || 0);
    if (forcedSit[pid]) pts = -9999;
    const conf = confidence(pts, p.injury_status);
    details![pid] = {
      playerId: pid,
      position: "BENCH",
      points: Number(pts.toFixed(2)),
      confidence: conf,
      tier: tierFrom(pts),
      note: p.injury_status || undefined,
    };
    return { pid, pts, pos: guessPos(pid, roster, projMap) };
  });

  // helpers
  const take = (pos: Exclude<Position,"FLEX">, n: number) => {
    const pool = rows
      .filter(r => !used.has(r.pid) && r.pos === pos && !forcedSit[r.pid])
      .sort((a,b) => (forcedStart[b.pid]?1:0) - (forcedStart[a.pid]?1:0) || b.pts - a.pts)
      .slice(0, Math.max(0, n));
    pool.forEach(r => { used.add(r.pid); details![r.pid]!.position = pos; });
    return pool.map(r => r.pid);
  };

  // primary slots (non-FLEX)
  const slots: WeeklyLineup["slots"] = {
    QB:  take("QB",  want.QB),
    RB:  take("RB",  want.RB),
    WR:  take("WR",  want.WR),
    TE:  take("TE",  want.TE),
    DST: take("DST", want.DST),
    K:   take("K",   want.K),
    FLEX:[]
  };

  // FLEX: honor pins first, then best remaining RB/WR/TE
  const pins = roster.pins?.FLEX || [];
  for (const pid of pins) {
    if (!used.has(pid) && !forcedSit[pid] && ["RB","WR","TE"].includes(rows.find(r=>r.pid===pid)?.pos || "")) {
      used.add(pid); details![pid]!.position = "FLEX";
      slots.FLEX.push(pid);
      if (slots.FLEX.length >= want.FLEX) break;
    }
  }
  if (slots.FLEX.length < want.FLEX) {
    const need = want.FLEX - slots.FLEX.length;
    const pool = rows
      .filter(r => !used.has(r.pid) && !forcedSit[r.pid] && (r.pos==="RB"||r.pos==="WR"||r.pos==="TE"))
      .sort((a,b) => (forcedStart[b.pid]?1:0) - (forcedStart[a.pid]?1:0) || b.pts - a.pts)
      .slice(0, need);
    pool.forEach(r => { used.add(r.pid); details![r.pid]!.position = "FLEX"; });
    slots.FLEX.push(...pool.map(r=>r.pid));
  }

  const bench = rows.filter(r => !used.has(r.pid)).sort((a,b)=>b.pts-a.pts).map(r=>r.pid);

  return {
    week,
    slots,
    bench,
    details,
    recommendedAt: new Date().toISOString(),
  };
}

/** rough position guess from prior roster/rules; replace with a real lookup if you store per-player meta */
function guessPos(pid: string, roster: UserRoster, _map: Record<string, any>): Position {
  // fallback guess (treat unknown as WR)
  // You can improve by caching Sleeper position for the id
  return (roster as any)._pos?.[pid] || "WR";
}
