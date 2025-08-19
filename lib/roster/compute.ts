import type { UserRoster, WeeklyLineup, AdminOverrides, Position } from "./types";
import { getRosterMeta } from "./store";

const CURRENT_YEAR = new Date().getFullYear();

type Proj = { pts_ppr?: number; injury_status?: string; opp_rank?: number };

async function fetchProjectionsMap(week: number): Promise<Record<string, Proj>> {
  const url = `https://api.sleeper.app/projections/nfl/${CURRENT_YEAR}/${week}?season_type=regular`;
  const res = await fetch(url, { cache: "no-store" });
  const rows = (await res.json().catch(() => [])) as any[];
  const out: Record<string, Proj> = {};
  for (const r of rows) {
    out[r.player_id] = {
      pts_ppr: r.stats?.pts_ppr,
      injury_status: r.injury_status,
      opp_rank: r.opponent_rank,
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

export async function computeLineup(
  roster: UserRoster,
  week: number,
  overrides: Partial<AdminOverrides> = {}
): Promise<WeeklyLineup> {
  const ov: AdminOverrides = {
    week,
    pointDelta: {},
    forceStart: {},
    forceSit: {},
    note: "",
    ...overrides,
  };

  const projMap = await fetchProjectionsMap(week);
  const want: Record<Position, number> = { ...roster.rules };

  // per-roster meta cache (names/pos/team)
  const rosterMeta = await getRosterMeta(roster.id);

  const details: WeeklyLineup["details"] = {};
  const forcedStart = ov.forceStart || {};
  const forcedSit = ov.forceSit || {};
  const deltas = ov.pointDelta || {};
  const used = new Set<string>();

  const rows = (roster.players || []).map((pid) => {
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
      breakdown: {
        scoring: (roster.scoring as any) || "PPR",
        base: Number((p.pts_ppr || 0).toFixed?.(2) ?? p.pts_ppr ?? 0),
        delta: Number((Number(deltas[pid] || 0)).toFixed(2)),
        injury: p.injury_status || undefined,
        forcedStart: !!forcedStart[pid],
        forcedSit: !!forcedSit[pid],
        oppRank: p.opp_rank,
        matchupTier:
          typeof p.opp_rank === "number"
            ? p.opp_rank <= 10
              ? "Green"
              : p.opp_rank <= 22
              ? "Yellow"
              : "Red"
            : undefined,
      },
    };
    return { pid, pts, pos: guessPos(pid, rosterMeta) };
  });

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

  const slots: WeeklyLineup["slots"] = {
    QB: take("QB", want.QB),
    RB: take("RB", want.RB),
    WR: take("WR", want.WR),
    TE: take("TE", want.TE),
    DST: take("DST", want.DST),
    K: take("K", want.K),
    FLEX: [],
  };

  const pins = roster.pins?.FLEX || [];
  for (const pid of pins) {
    if (
      !used.has(pid) &&
      !forcedSit[pid] &&
      ["RB", "WR", "TE"].includes(rows.find((r) => r.pid === pid)?.pos || "")
    ) {
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

  // totals
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

/** Single tolerant version: accepts plain maps, {names:{…}}, or null/undefined */
function guessPos(
  pid: string,
  meta:
    | Record<string, { pos?: string }>
    | { names?: Record<string, { pos?: string }> }
    | null
    | undefined
): Position {
  const pos =
    (meta as any)?.[pid]?.pos ??
    (meta as any)?.names?.[pid]?.pos ??
    undefined;

  if (pos === "QB" || pos === "RB" || pos === "WR" || pos === "TE" || pos === "DST" || pos === "K") {
    return pos;
  }
  return "WR";
}
