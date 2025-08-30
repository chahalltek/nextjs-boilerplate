// lib/roster/ensemble.adapter.ts
import {
  ActualRow, BlendedRow, DEFAULT_CFG, PerSourcePerf, PerSourceWeight, ProjectionRow,
  assignTiers, blendWeek, computeResiduals, computeWeights
} from "./ensemble";

export type LoaderFns = {
  // Must return normalized projections (your scoring) for ONE week or MULTIPLE weeks.
  // If 'weeks' is an array, return rows for ALL of those weeks.
  loadNormalizedProjections: (weekOrWeeks: number | number[], scoring: "PPR"|"HALF_PPR"|"STD")
    => Promise<ProjectionRow[]>;
  loadHistoricalActuals: (weeks: number[]) => Promise<ActualRow[]>;
};

export async function getBlendedForPlayers(opts: {
  targetWeek: number;
  scoring: "PPR"|"HALF_PPR"|"STD";
  playerIds: string[];
  loaders: LoaderFns;
  historyWeeks?: number[]; // if omitted, uses last 8 weeks by default (bounded in your loader)
}): Promise<Record<string, BlendedRow>> {
  const { targetWeek, scoring, playerIds, loaders } = opts;
  const historyWeeks = opts.historyWeeks ?? []; // let loaders decide default window if []

  // Load
  let projWeek = await loaders.loadNormalizedProjections(targetWeek, scoring).catch(() => []);
  let histProj = await loaders.loadNormalizedProjections(historyWeeks, scoring).catch(() => []);
  let actuals  = await loaders.loadHistoricalActuals(historyWeeks).catch(() => []);

  // Filter to just the players we care about for current week
  if (playerIds?.length && projWeek.length) {
    const set = new Set(playerIds);
    projWeek = projWeek.filter(r => set.has(r.playerId));
  }

  if (!projWeek.length) {
    return {}; // no inputs -> no-op
  }

  // Learn weights from history (if unavailable, equal weights)
  const resids = histProj.length && actuals.length ? computeResiduals(histProj, actuals) : [];
  const weights: PerSourceWeight[] = computeWeights(resids, DEFAULT_CFG);
  const perf: PerSourcePerf[] = resids.length ? // needed for within-model variance
    // reuse the perf aggregator from weights input
    (function(){
      // quick mini agg:
      const keyed = new Map<string, {n:number; se:number; ae:number}>();
      for (const r of resids as any[]) {
        const k = `${r.source}|${r.pos}`;
        const e = r.res as number;
        const v = keyed.get(k) ?? { n:0, se:0, ae:0 };
        v.n += 1; v.se += e*e; v.ae += Math.abs(e);
        keyed.set(k, v);
      }
      const out: PerSourcePerf[] = [];
      keyed.forEach((v, k) => {
        const [source, pos] = k.split("|") as any;
        out.push({ source, pos, rmse: Math.sqrt(v.se/Math.max(1,v.n)), mae: v.ae/Math.max(1,v.n), n: v.n });
      });
      return out;
    })()
  : [];

  // Blend and tier
  const blended = assignTiers(blendWeek(projWeek, weights, perf));

  const map: Record<string, BlendedRow> = {};
  for (const b of blended) map[b.playerId] = b;
  return map;
}
