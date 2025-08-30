// lib/roster/ensemble.ts
/* Weighted ensemble for fantasy projections:
   - per-position inverse-RMSE weights with shrinkage
   - correlation penalty for redundant sources
   - blended mean, uncertainty (within + between), CI
   - simple quantile-based tiering (A/B/C/D by default)
*/
export type SourceKey = "BLITZ" | "FTN" | "BAKER" | "ROTO" | "ML" | "CONSENSUS";
export type Pos = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export type ProjectionRow = {
  playerId: string;
  pos: Pos;
  week: number;
  source: SourceKey;
  projPts: number; // already normalized to your scoring/timeframe
};

export type ActualRow = {
  playerId: string;
  pos: Pos;
  week: number;
  actualPts: number;
};

export type WeightingConfig = {
  alpha: number;        // inverse-error exponent
  epsilon: number;      // numeric stability
  shrinkK: number;      // shrinkage toward prior weight=1
  corrPenalty: number;  // 0..1 penalty strength for residual correlation
};

export const DEFAULT_CFG: WeightingConfig = {
  alpha: 1.0,
  epsilon: 1e-6,
  shrinkK: 50,
  corrPenalty: 0.5,
};

export type PerSourcePerf = {
  source: SourceKey;
  pos: Pos;
  rmse: number;
  mae: number;
  n: number;
  avgAbsCorr?: number; // added later
};

export type PerSourceWeight = {
  source: SourceKey;
  pos: Pos;
  weight: number;
};

export type BlendedRow = {
  playerId: string;
  pos: Pos;
  projMean: number;
  stdTotal: number;
  ciLow: number;
  ciHigh: number;
  tier?: "A" | "B" | "C" | "D" | string;
};

export type RosterRules = { QB: number; RB: number; WR: number; TE: number; FLEX: number; DST: number; K: number };

// ---------- helpers ----------
function by<T extends string | number>(k: keyof any) {
  return (a: any, b: any) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0);
}

function isDstLike(pos?: string) {
  return pos === "DST" || pos === "DEF" || pos === "D/ST";
}

// Pearson correlation on aligned pairs
function corr(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n <= 1) return 0;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i], yi = y[i];
    sx += xi; sy += yi;
    sxx += xi * xi; syy += yi * yi; sxy += xi * yi;
  }
  const cov = sxy - (sx * sy) / n;
  const vx = sxx - (sx * sx) / n;
  const vy = syy - (sy * sy) / n;
  if (vx <= 0 || vy <= 0) return 0;
  return cov / Math.sqrt(vx * vy);
}

// ---------- residuals, performance, correlation ----------
export function computeResiduals(histProj: ProjectionRow[], actuals: ActualRow[]) {
  // index actuals by key
  const actMap = new Map<string, number>(); // `${playerId}|${pos}|${week}` -> actualPts
  for (const a of actuals) actMap.set(`${a.playerId}|${a.pos}|${a.week}`, a.actualPts);

  type Resid = ProjectionRow & { res: number };
  const out: Resid[] = [];
  for (const p of histProj) {
    const key = `${p.playerId}|${p.pos}|${p.week}`;
    const actual = actMap.get(key);
    if (actual == null) continue;
    out.push({ ...p, res: p.projPts - actual });
  }
  return out; // (player,pos,week,source,res,projPts)
}

export function aggregatePerf(resids: ReturnType<typeof computeResiduals>): PerSourcePerf[] {
  // group by (source,pos)
  const key = (r: any) => `${r.source}|${r.pos}`;
  const groups = new Map<string, ProjectionRow[]>();
  for (const r of resids) {
    const k = key(r);
    const g = groups.get(k);
    if (!g) groups.set(k, [r]); else g.push(r);
  }
  const out: PerSourcePerf[] = [];
  for (const [k, arr] of groups) {
    const [source, pos] = k.split("|") as [SourceKey, Pos];
    const n = arr.length;
    if (n === 0) continue;
    let se = 0, ae = 0;
    for (const r of arr as any[]) {
      const e = r.res as number;
      se += e * e;
      ae += Math.abs(e);
    }
    const rmse = Math.sqrt(se / n);
    const mae = ae / n;
    out.push({ source, pos, rmse, mae, n });
  }
  return out;
}

// Average absolute residual correlation per (source,pos)
export function correlationPenaltyBySourcePos(
  resids: ReturnType<typeof computeResiduals>
): { source: SourceKey; pos: Pos; avgAbsCorr: number }[] {
  // bucket by pos -> (key=(player,week), per-source residual map)
  type Key = string; // `${playerId}|${week}`
  type PosBucket = Map<Key, Map<SourceKey, number>>;

  const posBuckets = new Map<Pos, PosBucket>();
  for (const r of resids) {
    const pb = posBuckets.get(r.pos as Pos) ?? new Map<Key, Map<SourceKey, number>>();
    const k: Key = `${r.playerId}|${r.week}`;
    const slot = pb.get(k) ?? new Map<SourceKey, number>();
    slot.set(r.source as SourceKey, (r as any).res);
    pb.set(k, slot);
    posBuckets.set(r.pos as Pos, pb);
  }

  const results: { source: SourceKey; pos: Pos; avgAbsCorr: number }[] = [];

  for (const [pos, pb] of posBuckets) {
    // collect aligned vectors per source
    const perSource: Record<SourceKey, number[]> = {} as any;
    const keys = Array.from(pb.keys());
    // gather sources
    const allSources = new Set<SourceKey>();
    for (const m of pb.values()) for (const s of m.keys()) allSources.add(s);
    for (const s of allSources) perSource[s] = [];

    // alignment: only push value when every source has it? No—pairwise later.
    // We'll build per-source arrays per (player,week), padding with NaN and then filter in pairwise loop.
    // Easier: for each pair compute correlation using only intersection at that moment.
    const sources = Array.from(allSources);
    const avgAbs: Record<SourceKey, number[]> = Object.fromEntries(sources.map(s => [s, []])) as any;

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const s1 = sources[i]; const s2 = sources[j];
        const v1: number[] = []; const v2: number[] = [];
        for (const k of keys) {
          const row = pb.get(k)!;
          const a = row.get(s1); const b = row.get(s2);
          if (a == null || b == null) continue;
          v1.push(a); v2.push(b);
        }
        if (v1.length > 1) {
          const c = Math.abs(corr(v1, v2));
          avgAbs[s1].push(c);
          avgAbs[s2].push(c);
        }
      }
    }
    for (const s of sources) {
      const arr = avgAbs[s];
      const avg = arr && arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0;
      results.push({ pos, source: s, avgAbsCorr: avg });
    }
  }
  return results;
}

export function computeWeights(
  resids: ReturnType<typeof computeResiduals>,
  cfg: WeightingConfig = DEFAULT_CFG,
  sourcesAll: SourceKey[] = ["BLITZ","FTN","BAKER","ROTO","ML","CONSENSUS"],
  positionsAll: Pos[] = ["QB","RB","WR","TE","K","DST"]
): PerSourceWeight[] {
  const perf = aggregatePerf(resids);
  if (!perf.length) {
    // fallback to equal weights
    const out: PerSourceWeight[] = [];
    for (const pos of positionsAll) {
      const w = 1 / sourcesAll.length;
      for (const source of sourcesAll) out.push({ pos, source, weight: w });
    }
    return out;
  }
  const corrPen = correlationPenaltyBySourcePos(resids);
  const corrMap = new Map<string, number>(); // `${source}|${pos}` -> avgAbsCorr
  for (const c of corrPen) corrMap.set(`${c.source}|${c.pos}`, c.avgAbsCorr);

  // build map by (pos) -> rows
  const byPos = new Map<Pos, PerSourcePerf[]>();
  for (const row of perf) {
    const arr = byPos.get(row.pos) ?? [];
    arr.push(row);
    byPos.set(row.pos, arr);
  }

  const weights: PerSourceWeight[] = [];

  for (const pos of positionsAll) {
    const rows = byPos.get(pos) ?? [];
    // ensure every source appears at least with pseudo-entry
    const rowsAll: (PerSourcePerf & { wPen?: number; w?: number })[] = [];
    const set = new Set(rows.map(r => r.source));
    for (const r of rows) rowsAll.push(r);
    for (const s of sourcesAll) if (!set.has(s)) rowsAll.push({ source: s, pos, rmse: 1.0, mae: 1.0, n: 0, avgAbsCorr: 0 });

    // compute raw inverse-error
    for (const r of rowsAll) {
      const wRaw = 1 / Math.pow((r.rmse ?? 1) + cfg.epsilon, cfg.alpha);
      const shrink = r.n / (r.n + cfg.shrinkK);
      const wShrunk = shrink * wRaw + (1 - shrink) * 1.0;
      const avgCorr = corrMap.get(`${r.source}|${pos}`) ?? 0;
      const wPen = wShrunk / (1 + cfg.corrPenalty * avgCorr);
      (r as any).wPen = wPen;
    }
    // normalize
    const sum = rowsAll.reduce((s, r: any) => s + (r.wPen as number), 0) || 1;
    for (const r of rowsAll) {
      const weight = (r as any).wPen / sum;
      weights.push({ source: r.source, pos, weight });
    }
  }
  return weights;
}

// ---------- blend this week ----------
export function blendWeek(
  projWeek: ProjectionRow[],
  weights: PerSourceWeight[],
  perf: PerSourcePerf[]
): BlendedRow[] {
  // maps for quick lookup
  const wMap = new Map<string, number>(); // `${pos}|${source}` -> weight
  for (const w of weights) wMap.set(`${w.pos}|${w.source}`, w.weight);
  const sigmaMap = new Map<string, number>(); // `${pos}|${source}` -> rmse
  for (const p of perf) sigmaMap.set(`${p.pos}|${p.source}`, p.rmse);

  // group by (player,pos)
  type Key = string;
  const groups = new Map<Key, ProjectionRow[]>();
  for (const p of projWeek) {
    const k = `${p.playerId}|${p.pos}`;
    const g = groups.get(k);
    if (!g) groups.set(k, [p]); else g.push(p);
  }

  const out: BlendedRow[] = [];
  for (const [key, arr] of groups) {
    const [playerId, pos] = key.split("|") as [string, Pos];

    // effective weights among present sources
    const present = arr.map((r) => ({
      ...r,
      w: wMap.get(`${r.pos}|${r.source}`) ?? 0,
      sigma: sigmaMap.get(`${r.pos}|${r.source}`) ?? 0,
    }));
    const sumW = present.reduce((s, r) => s + r.w, 0);
    const renorm = sumW > 0 ? (x: number) => x / sumW : (_: number) => 1 / Math.max(1, present.length);

    for (const r of present) (r as any).wEff = renorm(r.w);

    const mean = present.reduce((s, r: any) => s + r.wEff * r.projPts, 0);

    // between-model variance (disagreement)
    const varBetween = present.reduce((s, r: any) => s + r.wEff * (r.projPts - mean) ** 2, 0);
    // within-model variance from historical RMSE
    const varWithin = present.reduce((s, r: any) => s + (r.wEff ** 2) * (r.sigma ** 2), 0);
    const varTotal = Math.max(0, varBetween + varWithin);
    const std = Math.sqrt(varTotal);
    const ciLow = mean - 1.96 * std;
    const ciHigh = mean + 1.96 * std;

    out.push({ playerId, pos, projMean: mean, stdTotal: std, ciLow, ciHigh });
  }
  return out;
}

// ---------- tiers (simple quantile approach) ----------
export function assignTiers(
  blended: BlendedRow[],
  letters: string[] = ["A", "B", "C", "D"]
): BlendedRow[] {
  const byPos = new Map<Pos, BlendedRow[]>();
  for (const row of blended) {
    const arr = byPos.get(row.pos) ?? [];
    arr.push(row);
    byPos.set(row.pos, arr);
  }
  const out: BlendedRow[] = [];
  for (const [pos, arr] of byPos) {
    const sorted = [...arr].sort((a, b) => b.projMean - a.projMean);
    const n = sorted.length || 1;
    const cuts = letters.length;
    for (let i = 0; i < sorted.length; i++) {
      const q = i / n;
      // map quantile to tier index (top = A)
      const idx = Math.min(
        cuts - 1,
        q < 0.15 ? 0 : q < 0.50 ? 1 : q < 0.85 ? 2 : 3
      );
      out.push({ ...sorted[i], tier: letters[idx] as any });
    }
  }
  // restore input order as best-effort
  return out.sort(by<"playerId">("playerId"));
}

// ---------- convenience: apply blend to an existing lineup ----------
export type WeeklyLineup = {
  week: number;
  slots: Record<string, string[]>; // e.g., { QB: ["p1"], RB:["p2","p3"], ... }
  bench?: string[];
  details?: Record<
    string,
    { playerId: string; position: string; points: number; confidence: number; tier: "A"|"B"|"C"|"D"; note?: string;
      breakdown?: { scoring: "PPR"|"HALF_PPR"|"STD"; base: number; delta: number; injury?: string; forcedStart?: boolean; forcedSit?: boolean; oppRank?: number; matchupTier?: "Green"|"Yellow"|"Red"; };
    }
  >;
  scores?: number;
};

export function applyBlendedToLineup(options: {
  lineup: WeeklyLineup;
  rules: RosterRules;
  blended: Record<string, BlendedRow>; // by playerId
  playerMeta: Record<string, { pos?: string }>;
}): WeeklyLineup {
  const { lineup, rules, blended, playerMeta } = options;
  const order: (keyof RosterRules)[] = ["QB", "RB", "WR", "TE", "DST", "K", "FLEX"];

  // score getter with fallback
  const scoreOf = (pid: string) =>
    blended[pid]?.projMean ??
    lineup.details?.[pid]?.points ??
    0;

  // position getter (prefer meta)
  const posOf = (pid: string): Pos | undefined => {
    const p = playerMeta[pid]?.pos || lineup.details?.[pid]?.position;
    if (!p) return undefined;
    if (isDstLike(p)) return "DST";
    return (p as any) as Pos;
  };

  const pool = new Set<string>([
    ...order.flatMap((s) => lineup.slots?.[s] || []),
    ...(lineup.bench || []),
  ]);

  const takeBest = (eligible: string[], count: number): string[] => {
    return eligible
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(0, Math.max(0, count));
  };

  const nextSlots: Record<string, string[]> = { QB:[], RB:[], WR:[], TE:[], DST:[], K:[], FLEX:[] };
  const used = new Set<string>();

  // dedicated slots
  for (const slot of ["QB","RB","WR","TE","DST","K"] as (keyof RosterRules)[]) {
    const need = rules[slot] ?? 0;
    if (!need) continue;
    const elig = Array.from(pool).filter((pid) => {
      const pos = posOf(pid);
      if (!pos) return false;
      if (slot === "DST") return pos === "DST";
      return pos === slot;
    }).filter(pid => !used.has(pid));
    const picks = takeBest(elig, need);
    for (const pid of picks) used.add(pid);
    nextSlots[slot] = picks;
  }

  // FLEX (RB/WR/TE)
  const flexNeed = rules.FLEX ?? 0;
  if (flexNeed > 0) {
    const elig = Array.from(pool).filter((pid) => {
      const pos = posOf(pid);
      return pos === "RB" || pos === "WR" || pos === "TE";
    }).filter(pid => !used.has(pid));
    const picks = takeBest(elig, flexNeed);
    for (const pid of picks) used.add(pid);
    nextSlots.FLEX = picks;
  }

  // bench = everyone else, sorted by score desc
  const bench = Array.from(pool).filter((pid) => !used.has(pid))
    .sort((a, b) => scoreOf(b) - scoreOf(a));

  // update details.points with blended values where present
  const details = { ...(lineup.details || {}) };
  for (const pid of pool) {
    const d = details[pid] || {
      playerId: pid,
      position: posOf(pid) || "BENCH",
      points: 0,
      confidence: 0.5,
      tier: "C" as const,
    };
    const b = blended[pid];
    if (b) {
      d.points = b.projMean;
      // keep position; no change
    }
    details[pid] = d;
  }

  const totalScore =
    [...nextSlots.QB, ...nextSlots.RB, ...nextSlots.WR, ...nextSlots.TE, ...nextSlots.DST, ...nextSlots.K, ...nextSlots.FLEX]
      .reduce((s, pid) => s + (details[pid]?.points || 0), 0);

  return {
    ...lineup,
    slots: nextSlots,
    bench,
    details,
    scores: totalScore,
  };
}
