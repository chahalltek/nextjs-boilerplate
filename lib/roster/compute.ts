// lib/roster/compute.ts
import type { UserRoster, WeeklyLineup, AdminOverrides, Position } from "./types";

const CURRENT_YEAR = new Date().getFullYear();

type Scoring = "PPR" | "HALF_PPR" | "STD";

type Proj = {
  pts_ppr?: number;
  pts_half_ppr?: number;
  pts_std?: number;
  injury_status?: string;
  opp_rank?: number;
};

async function fetchProjectionsMap(week: number): Promise<Record<string, Proj>> {
  const url = `https://api.sleeper.app/projections/nfl/${CURRENT_YEAR}/${week}?season_type=regular`;
  const res = await fetch(url, { cache: "no-store" });
  const rows = (await res.json().catch(() => [])) as any[];
  const out: Record<string, Proj> = {};
  for (const r of rows) {
    // Sleeper often nests under r.stats.*
    const stats = r?.stats || {};
    out[r.player_id] = {
      pts_ppr: Number(stats.pts_ppr ?? r.pts_ppr ?? 0) || 0,
      pts_half_ppr: Number(stats.pts_half_ppr ?? r.pts_half_ppr ?? 0) || undefined,
      pts_std: Number(stats.pts_std ?? r.pts_std ?? 0) || undefined,
      injury_status: r.injury_status || stats.injury_status,
      opp_rank: Number(r.opponent_rank ?? stats.opponent_rank ?? stats.opp_rank ?? NaN),
    };
  }
  return out;
}

function tierFrom(points: number): "A" | "B" | "C" | "D" {
  if (points >= 18) return "A";
  if (points >= 12) return "B";
  if (points >= 8) return "C";
  return "D";
}

function confidence(points: number, injury?: string) {
  let c = Math.max(0, Math.min(1, points / 24));
  if (injury === "OUT" || injury === "Doubtful") c *= 0.1;
  else if (injury === "Questionable") c *= 0.8;
  return Number(c.toFixed(2));
}

function pickBasePoints(p: Proj, scoring: Scoring): number {
  const ppr = Number(p.pts_ppr || 0);

  // Reasonable fallbacks if Sleeper doesn’t provide the exact stat
  const std = p.pts_std != null ? Number(p.pts_std) : Math.max(0, ppr * 0.85);
  const half =
    p.pts_half_ppr != null
      ? Number(p.pts_half_ppr)
      : Math.max(0, std + (ppr - std) / 2); // middle ground

  if (scoring === "PPR") return ppr;
  if (scoring === "HALF_PPR") return half;
  return std;
}

function matchupTier(oppRank?: number): "Green" | "Yellow" | "Red" | undefined {
  if (!Number.isFinite(oppRank as number)) return undefined;
  const r = Number(oppRank);
  if (r <= 10) return "Red";       // tougher defense
  if (r <= 22) return "Yellow";    // neutral
  return "Green";                  // easier/plus matchup
}

export async function computeLineup(
  roster: UserRoster,
  week: number,
  overrides: Partial<AdminOverrides> = {}
): Promise<WeeklyLineup> {
  const projMap = await fetchProjectionsMap(week);
  const want: Record<Position, number> = { ...roster.rules };
  const scoring: Scoring = ((roster as any).scoring as Scoring) || "PPR";

  const forcedStart = overrides.forceStart || {};
  const forcedSit = overrides.forceSit || {};
  const deltas = overrides.pointDelta || {};
  const used = new Set<string>();

  const details: WeeklyLineup["details"] = {};

  // Build candidate list with points & metadata
  const rows = (roster.players || []).map((pid) => {
    const p = projMap[pid] || {};
    const base = pickBasePoints(p, scoring);
    const delta = Number(deltas[pid] || 0);
    let pts = base + delta;
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

    // Opt-in extra breakdown for UI (keeps types file unchanged)
    (details![pid] as any).breakdown = {
      scoring,
      base: Number(base.toFixed(2)),
      delta: Number(delta.toFixed(2)),
      injury: p.injury_status || undefined,
      forcedStart: !!forcedStart[pid],
      forcedSit: !!forcedSit[pid],
      oppRank: Number.isFinite(p.opp_rank as number) ? Number(p.opp_rank) : undefined,
      matchupTier: matchupTier(p.opp_rank),
    };

    return { pid, pts, pos: guessPos(pid, roster, projMap) };
  });

  // Helper: choose top N by slot, honoring forcedStart
  const take = (pos: Exclude<Position, "FLEX">, n: number) => {
    const pool = rows
      .filter((r) => !used.has(r.pid) && r.pos === pos && !forcedSit[r.pid])
      .sort(
        (a, b) =>
          (forcedStart[b.pid] ? 1 : 0) - (forcedStart[a.pid] ? 1 : 0) ||
          b.pts - a.pts
      )
      .slice(0, Math.max(0, n));
    pool.forEach((r) => {
      used.add(r.pid);
      details![r.pid]!.position = pos;
    });
    return pool.map((r) => r.pid);
  };

  // Primary slots
  const slots: WeeklyLineup["slots"] = {
    QB: take("QB", want.QB),
    RB: take("RB", want.RB),
    WR: take("WR", want.WR),
    TE: take("TE", want.TE),
    DST: take("DST", want.DST),
    K: take("K", want.K),
    FLEX: [],
  };

  // FLEX: honor pins first, then best remaining RB/WR/TE
  const pins = (roster as any).pins?.FLEX || [];
  for (const pid of pins) {
    const r = rows.find((x) => x.pid === pid);
    if (!r) continue;
    if (!used.has(pid) && !forcedSit[pid] && (r.pos === "RB" || r.pos === "WR" || r.pos === "TE")) {
      used.add(pid);
      details![pid]!.position = "FLEX";
      slots.FLEX.push(pid);
      if (slots.FLEX.length >= want.FLEX) break;
    }
  }
  if (slots.FLEX.length < want.FLEX) {
    const need = want.FLEX - slots.FLEX.length;
    const pool = rows
      .filter(
        (r) =>
          !used.has(r.pid) &&
          !forcedSit[r.pid] &&
          (r.pos === "RB" || r.pos === "WR" || r.pos === "TE")
      )
      .sort(
        (a, b) =>
          (forcedStart[b.pid] ? 1 : 0) - (forcedStart[a.pid] ? 1 : 0) ||
          b.pts - a.pts
      )
      .slice(0, need);
    pool.forEach((r) => {
      used.add(r.pid);
      details![r.pid]!.position = "FLEX";
    });
    slots.FLEX.push(...pool.map((r) => r.pid));
  }

  const bench = rows
    .filter((r) => !used.has(r.pid))
    .sort((a, b) => b.pts - a.pts)
    .map((r) => r.pid);

  // Total only (your WeeklyLineup.scores is a number)
  type SlotKey = keyof WeeklyLineup["slots"];
  const slotTotals = Object.fromEntries(
    (Object.keys(slots) as SlotKey[]).map((k) => {
      const ids = slots[k] || [];
      const sum = ids.reduce((acc, id) => acc + (details[id]?.points || 0), 0);
      return [k, Number(sum.toFixed(2))];
    })
  ) as Record<SlotKey, number>;
  const total = Number(
    (Object.values(slotTotals) as number[]).reduce((a, b) => a + b, 0).toFixed(2)
  );

  return {
    week,
    slots,
    bench,
    details,
    scores: total,
    recommendedAt: new Date().toISOString(),
  };
}

/** Placeholder: treat unknown as WR unless you store position meta per player */
function guessPos(_pid: string, roster: UserRoster, _map: Record<string, any>): Position {
  return (roster as any)._pos?.[_pid] || "WR";
}
