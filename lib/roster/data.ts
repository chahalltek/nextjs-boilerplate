// lib/roster/data.ts
import type { Position } from "./types";

/* ===========================
   Types
   =========================== */

export type SourceId =
  | "BLITZ"
  | "FTN"
  | "BAKER"
  | "ROTO"
  | "ML"
  | "CONSENSUS"
  | "SLEEPER";

export type ScoringProfile = "PPR" | "HALF_PPR" | "STD";

export interface ProjectionRow {
  playerId: string;
  position: Position;            // QB | RB | WR | TE | DST | K
  week: number;
  season: number;
  pts_ppr: number;
  pts_half?: number;
  pts_std?: number;
  source: SourceId;
  updatedAt: string;             // ISO
  team?: string;
  meta?: Record<string, unknown>;
}

export interface ActualRow {
  playerId: string;
  position?: Position;
  week: number;
  season: number;
  pts_ppr: number;
  pts_half?: number;
  pts_std?: number;
  team?: string;
  updatedAt?: string;
}

/* ===========================
   Public Loaders
   =========================== */

/**
 * Load & normalize projections for the given week from all configured sources.
 * Returns one ProjectionRow per (source, player).
 */
export async function getWeeklyNormalizedProjections(
  season: number,
  week: number
): Promise<ProjectionRow[]> {
  const [
    blitz,
    ftn,
    baker,
    roto,
    ml,
    consensus,
    sleeperFallback,
  ] = await Promise.all([
    fetchBlitzProjections(season, week),
    fetchFtnProjections(season, week),
    fetchBakerProjections(season, week),
    fetchRotoWireProjections(season, week),
    fetchMlProjections(season, week),
    fetchConsensusProjections(season, week),
    fetchSleeperProjections(season, week), // safe fallback; can also be part of the blend
  ]);

  // Flatten & sanitize
  const rows = [
    ...blitz,
    ...ftn,
    ...baker,
    ...roto,
    ...ml,
    ...consensus,
    ...sleeperFallback,
  ]
    .map(sanitizeProjectionRow)
    // Only keep rows with a valid position and finite PPR
    .filter((r) => !!r.position && Number.isFinite(r.pts_ppr));

  return rows;
}

/**
 * Load historical actuals (and optionally past projections, if you wire adapters)
 * for a rolling accuracy window: [startWeek..endWeek].
 *
 * If you pass `sourcesForPastProjections`, we’ll attempt to return matching past
 * projections too (keyed by source). You can ignore that and just use actuals.
 */
export async function getHistoricalActuals(opts: {
  season: number;
  startWeek: number;  // inclusive
  endWeek: number;    // inclusive
  sourcesForPastProjections?: SourceId[]; // optional
}): Promise<{
  actuals: ActualRow[];
  pastProjectionsBySource: Record<SourceId, ProjectionRow[]>; // may be empty
}> {
  const { season, startWeek, endWeek, sourcesForPastProjections = [] } = opts;

  // Actuals: use your internal endpoint if available, fallback to Sleeper
  const [custom, sleeper] = await Promise.all([
    fetchCustomActuals(season, startWeek, endWeek),
    fetchSleeperActuals(season, startWeek, endWeek),
  ]);

  const actuals = (custom.length ? custom : sleeper)
    .map(sanitizeActualRow)
    .filter((r) => Number.isFinite(r.pts_ppr));

  const pastProjectionsBySource: Record<SourceId, ProjectionRow[]> = {};
  if (sourcesForPastProjections.length) {
    const promises = sourcesForPastProjections.map(async (src) => {
      const byWeek = await Promise.all(
        range(startWeek, endWeek).map((wk) =>
          fetchPastProjectionsForSource(src, season, wk)
        )
      );
      const flat = byWeek.flat().map(sanitizeProjectionRow);
      pastProjectionsBySource[src] = flat;
    });
    await Promise.all(promises);
  }

  return { actuals, pastProjectionsBySource };
}

/* ===========================
   Source Adapters (Projections)
   Replace URL/envs with your real data feeds
   =========================== */

// THE BLITZ
async function fetchBlitzProjections(season: number, week: number): Promise<ProjectionRow[]> {
  const url = process.env.BLITZ_URL; // e.g. https://your-api/blitz?season={season}&week={week}
  const token = process.env.BLITZ_TOKEN;
  if (!url) return [];
  const res = await safeFetch(jsonUrl(url, { season, week }), { headers: authHeader(token) });
  const rows = (await res.json().catch(() => [])) as any[];
  return rows.map((r) => adaptGenericProjection(r, "BLITZ", season, week));
}

// FTN
async function fetchFtnProjections(season: number, week: number): Promise<ProjectionRow[]> {
  const url = process.env.FTN_URL;
  const token = process.env.FTN_TOKEN;
  if (!url) return [];
  const res = await safeFetch(jsonUrl(url, { season, week }), { headers: authHeader(token) });
  const rows = (await res.json().catch(() => [])) as any[];
  return rows.map((r) => adaptGenericProjection(r, "FTN", season, week));
}

// BAKER
async function fetchBakerProjections(season: number, week: number): Promise<ProjectionRow[]> {
  const url = process.env.BAKER_URL;
  const token = process.env.BAKER_TOKEN;
  if (!url) return [];
  const res = await safeFetch(jsonUrl(url, { season, week }), { headers: authHeader(token) });
  const rows = (await res.json().catch(() => [])) as any[];
  return rows.map((r) => adaptGenericProjection(r, "BAKER", season, week));
}

// RotoWire
async function fetchRotoWireProjections(season: number, week: number): Promise<ProjectionRow[]> {
  const url = process.env.ROTO_URL;
  const token = process.env.ROTO_TOKEN;
  if (!url) return [];
  const res = await safeFetch(jsonUrl(url, { season, week }), { headers: authHeader(token) });
  const rows = (await res.json().catch(() => [])) as any[];
  return rows.map((r) => adaptGenericProjection(r, "ROTO", season, week));
}

// In-house ML
async function fetchMlProjections(season: number, week: number): Promise<ProjectionRow[]> {
  const url = process.env.ML_URL;
  if (!url) return [];
  const res = await safeFetch(jsonUrl(url, { season, week }));
  const rows = (await res.json().catch(() => [])) as any[];
  return rows.map((r) => adaptGenericProjection(r, "ML", season, week));
}

// Consensus
async function fetchConsensusProjections(season: number, week: number): Promise<ProjectionRow[]> {
  const url = process.env.CONSENSUS_URL;
  if (!url) return [];
  const res = await safeFetch(jsonUrl(url, { season, week }));
  const rows = (await res.json().catch(() => [])) as any[];
  return rows.map((r) => adaptGenericProjection(r, "CONSENSUS", season, week));
}

// Sleeper fallback (public)
async function fetchSleeperProjections(season: number, week: number): Promise<ProjectionRow[]> {
  try {
    const url = `https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular`;
    const res = await safeFetch(url);
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map((r: any): ProjectionRow => {
      const ppr = num(r?.stats?.pts_ppr);
      const half = num(r?.stats?.pts_half_ppr ?? ppr * 0.85); // heuristic if not supplied
      const std = num(r?.stats?.pts_std ?? ppr * 0.7);        // heuristic if not supplied
      return {
        playerId: String(r.player_id),
        position: normalizePos(r?.position) ?? "WR",
        week,
        season,
        pts_ppr: ppr,
        pts_half: half,
        pts_std: std,
        source: "SLEEPER",
        updatedAt: new Date().toISOString(),
        team: r?.team,
        meta: { injury_status: r?.injury_status, opp_rank: r?.opponent_rank },
      };
    });
  } catch {
    return [];
  }
}

/* ===========================
   Source Adapters (Historical Actuals)
   =========================== */

// Your internal/paid feed (preferred, if available)
async function fetchCustomActuals(
  season: number,
  startWeek: number,
  endWeek: number
): Promise<ActualRow[]> {
  const url = process.env.ACTUALS_URL; // e.g. https://your-api/actuals?season={season}&startWeek={...}&endWeek={...}
  if (!url) return [];
  const res = await safeFetch(jsonUrl(url, { season, startWeek, endWeek }));
  const rows = (await res.json().catch(() => [])) as any[];
  return rows.map(adaptGenericActual);
}

// Sleeper as a fallback (weekly actual points)
async function fetchSleeperActuals(
  season: number,
  startWeek: number,
  endWeek: number
): Promise<ActualRow[]> {
  try {
    const weeks = range(startWeek, endWeek);
    const all: ActualRow[] = [];
    for (const wk of weeks) {
      // Known public endpoint for weekly stats:
      // https://api.sleeper.app/stats/nfl/regular/{season}/{week}
      const url = `https://api.sleeper.app/stats/nfl/regular/${season}/${wk}`;
      const res = await safeFetch(url);
      const body = await res.json().catch(() => ({} as any));
      // Sleeper returns a map keyed by player_id in many stat endpoints
      const map = (Array.isArray(body) ? {} : body) as Record<string, any>;
      for (const [playerId, s] of Object.entries(map)) {
        const ppr = num(s?.pts_ppr ?? s?.stats?.pts_ppr);
        const half = num(s?.pts_half_ppr ?? s?.stats?.pts_half_ppr ?? ppr * 0.85);
        const std = num(s?.pts_std ?? s?.stats?.pts_std ?? ppr * 0.7);
        all.push({
          playerId,
          position: normalizePos(s?.position),
          week: wk,
          season,
          pts_ppr: ppr,
          pts_half: half,
          pts_std: std,
          team: s?.team ?? s?.player?.team,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return all;
  } catch {
    return [];
  }
}

/* ===========================
   Past Projections by Source (optional)
   =========================== */

async function fetchPastProjectionsForSource(
  source: SourceId,
  season: number,
  week: number
): Promise<ProjectionRow[]> {
  switch (source) {
    case "BLITZ":
      return fetchBlitzProjections(season, week);
    case "FTN":
      return fetchFtnProjections(season, week);
    case "BAKER":
      return fetchBakerProjections(season, week);
    case "ROTO":
      return fetchRotoWireProjections(season, week);
    case "ML":
      return fetchMlProjections(season, week);
    case "CONSENSUS":
      return fetchConsensusProjections(season, week);
    case "SLEEPER":
      return fetchSleeperProjections(season, week);
    default:
      return [];
  }
}

/* ===========================
   Adapter Helpers
   =========================== */

function adaptGenericProjection(
  r: any,
  source: Exclude<SourceId, "SLEEPER">,
  season: number,
  week: number
): ProjectionRow {
  // Expect *some* form of player id, position and points.
  // Map your feed’s fields here.
  const ppr = num(r?.pts_ppr ?? r?.ppr ?? r?.points ?? r?.proj);
  const half = num(r?.pts_half ?? r?.half ?? (Number.isFinite(ppr) ? ppr * 0.85 : undefined));
  const std = num(r?.pts_std ?? r?.std ?? (Number.isFinite(ppr) ? ppr * 0.7 : undefined));
  return {
    playerId: String(r?.playerId ?? r?.player_id ?? r?.id),
    position: normalizePos(r?.position) ?? "WR",
    week,
    season,
    pts_ppr: ppr,
    pts_half: half,
    pts_std: std,
    source,
    updatedAt: iso(r?.updatedAt ?? r?.updated_at),
    team: r?.team ?? r?.nfl_team,
    meta: r,
  };
}

function adaptGenericActual(r: any): ActualRow {
  const ppr = num(r?.pts_ppr ?? r?.ppr ?? r?.points ?? r?.actual);
  const half = num(r?.pts_half ?? r?.half ?? (Number.isFinite(ppr) ? ppr * 0.85 : undefined));
  const std = num(r?.pts_std ?? r?.std ?? (Number.isFinite(ppr) ? ppr * 0.7 : undefined));
  return {
    playerId: String(r?.playerId ?? r?.player_id ?? r?.id),
    position: normalizePos(r?.position),
    week: int(r?.week),
    season: int(r?.season),
    pts_ppr: ppr,
    pts_half: half,
    pts_std: std,
    team: r?.team ?? r?.nfl_team,
    updatedAt: iso(r?.updatedAt ?? r?.updated_at),
  };
}

/* ===========================
   Normalization Utils
   =========================== */

function normalizePos(raw?: string): Position | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const s = raw.toUpperCase().replace(/\s+/g, "");
  if (s === "QB" || s === "RB" || s === "WR" || s === "TE" || s === "K") return s as Position;
  if (s === "DST" || s === "DEF" || s === "D/ST" || s === "DST/DEF" || s === "DDEF") return "DST";
  if (s === "PK") return "K";
  return undefined;
}

function sanitizeProjectionRow(r: ProjectionRow): ProjectionRow {
  return {
    ...r,
    position: normalizePos(r.position) ?? "WR",
    pts_ppr: num(r.pts_ppr),
    pts_half: num(r.pts_half),
    pts_std: num(r.pts_std),
    updatedAt: iso(r.updatedAt),
  };
}

function sanitizeActualRow(r: ActualRow): ActualRow {
  return {
    ...r,
    position: normalizePos(r.position),
    pts_ppr: num(r.pts_ppr),
    pts_half: num(r.pts_half),
    pts_std: num(r.pts_std),
    updatedAt: r.updatedAt ? iso(r.updatedAt) : undefined,
  };
}

/* ===========================
   Small helpers
   =========================== */

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function int(v: any): number {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

function iso(v: any): string {
  const d = new Date(v);
  return Number.isFinite(d.valueOf()) ? d.toISOString() : new Date().toISOString();
}

function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function jsonUrl(base: string, q: Record<string, string | number | boolean | undefined>) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, { ...init, cache: "no-store" });
  } catch {
    // Return a dummy Response with empty JSON to keep callers simple
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}
