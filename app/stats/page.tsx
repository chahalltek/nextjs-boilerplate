// app/stats/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type SeasonType = "pre" | "regular";

interface PlayerInfo {
  player_id: string;
  full_name?: string;
  team?: string;
  position?: string;
  injury_status?: string;
}

interface StatEntry {
  player_id: string;
  stats?: Record<string, number>;
}

interface CombinedRow {
  id: string;
  name: string;
  team?: string;
  position?: string;
  injury?: string;
  proj: number;
  actual: number;
}

/* ---------- simple CSS ticker ---------- */
function Ticker({ items, duration = 35 }: { items: string[]; duration?: number }) {
  if (!items?.length) return null;
  const text = items.join("  •  ");
  return (
    <div className="w-full overflow-hidden border-y border-white/10 bg-white/5">
      <div className="relative">
        <div className="ticker-track py-2 text-sm whitespace-nowrap" style={{ animationDuration: `${duration}s` }}>
          <span className="pr-12">{text}</span>
          {/* duplicate for seamless loop */}
          <span className="pr-12" aria-hidden="true">{text}</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: inline-flex;
          will-change: transform;
          animation-name: ticker-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}
/* ---------- ticker (end) ---------- */

const CURRENT_YEAR = new Date().getFullYear();
const WEEK_OPTIONS: Record<SeasonType, number[]> = {
  pre: Array.from({ length: 4 }, (_, i) => i + 1),
  regular: Array.from({ length: 18 }, (_, i) => i + 1),
};

export default function StatsPage() {
  const [seasonType, setSeasonType] = useState<SeasonType>("pre");
  const [week, setWeek] = useState(1);
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [projections, setProjections] = useState<StatEntry[]>([]);
  const [actual, setActual] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"ALL" | "QB" | "RB" | "WR" | "TE" | "DST" | "K">("ALL");

  // Optional: auto-detect current season type & week from Sleeper state
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://api.sleeper.app/state/nfl", { cache: "no-store" });
        const j = await res.json();
        if (j?.season_type === "pre" || j?.season_type === "regular") {
          setSeasonType(j.season_type);
        }
        if (Number.isFinite(j?.week)) {
          setWeek(Number(j.week));
        }
      } catch {
        /* ignore – fall back to defaults */
      }
    })();
  }, []);

  // Load player metadata once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://api.sleeper.app/v1/players/nfl", { cache: "no-store" });
        const data = await res.json();
        setPlayers(data || {});
      } catch (err) {
        console.error("players load failed", err);
      }
    })();
  }, []);

  // Load projections + actuals whenever toggles change
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [projRes, actRes] = await Promise.all([
          fetch(
            `https://api.sleeper.app/projections/nfl/${CURRENT_YEAR}/${week}?season_type=${seasonType}`,
            { cache: "no-store" }
          ),
          fetch(
            `https://api.sleeper.app/stats/nfl/${seasonType}/${CURRENT_YEAR}/${week}`,
            { cache: "no-store" }
          ),
        ]);

        const projBody = await projRes.json().catch(() => []);
        const actBody = await actRes.json().catch(() => ({}));

        setProjections(toArray(projBody));     // normalize
        setActual(toArrayFromStats(actBody));  // map->array
      } catch (err) {
        console.error("weekly load failed", err);
        setProjections([]);
        setActual([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [seasonType, week]);

  // Build a combined table keyed by player
  const rows: CombinedRow[] = useMemo(() => {
    const projMap = new Map<string, number>();
    for (const r of projections) projMap.set(r.player_id, num(r.stats?.pts_ppr));

    const actMap = new Map<string, number>();
    for (const r of actual) actMap.set(r.player_id, num(r.stats?.pts_ppr));

    const ids = new Set([...projMap.keys(), ...actMap.keys()]);
    const out: CombinedRow[] = [];
    for (const id of ids) {
      const info = players[id] || {};
      const position = normalizePos(info.position);
      const proj = projMap.get(id) ?? 0;
      const act = actMap.get(id) ?? 0;

      if (role !== "ALL" && position !== role) continue;
      out.push({
        id,
        name: info.full_name || id,
        team: info.team,
        position: position || "WR",
        injury: info.injury_status,
        proj,
        actual: act,
      });
    }
    out.sort((a, b) => (b.actual || 0) - (a.actual || 0) || (b.proj || 0) - (a.proj || 0));
    return out.slice(0, 50);
  }, [projections, actual, players, role]);

  // Build ticker items: top PPR scorers (ALL positions)
  const tickerItems = useMemo(() => {
    const entries = actual
      .map((e) => ({ id: e.player_id, pts: num(e.stats?.pts_ppr) }))
      .filter((e) => e.pts > 0);

    entries.sort((a, b) => b.pts - a.pts);
    const top = entries.slice(0, 30);

    return top.map(({ id, pts }) => {
      const info = players[id] || {};
      const pos = normalizePos(info.position) || "?";
      const team = info.team || "?";
      const name = info.full_name || id;
      return `${name} (${team}, ${pos}) — ${pts.toFixed(1)}`;
    });
  }, [actual, players]);

  const weeks = WEEK_OPTIONS[seasonType];

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Weekly Stats</h1>
        <p className="text-xs text-white/60 mt-2">
          Data from Sleeper • Season {CURRENT_YEAR} • {seasonType === "pre" ? "Preseason" : "Regular Season"}
        </p>
      </header>

      {/* --- Top Fantasy Points ticker (replaces schedule ticker) --- */}
      <Ticker items={tickerItems} duration={40} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm ${seasonType === "pre" ? "bg-white/10" : ""}`}
            onClick={() => setSeasonType("pre")}
          >
            Pre
          </button>
          <button
            className={`px-3 py-1.5 text-sm ${seasonType === "regular" ? "bg-white/10" : ""}`}
            onClick={() => setSeasonType("regular")}
          >
            Regular
          </button>
        </div>

        <label className="text-sm text-white/70">
          Week{" "}
          <select
            className="ml-1 bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
          >
            {weeks.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-white/70">
          Role{" "}
          <select
            className="ml-1 bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option>ALL</option>
            <option>QB</option>
            <option>RB</option>
            <option>WR</option>
            <option>TE</option>
            <option>DST</option>
            <option>K</option>
          </select>
        </label>

        {loading && <span className="text-xs text-white/60">Loading…</span>}
      </div>

      {/* Combined table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/10 text-white/70">
              <th className="py-2 px-3">Player</th>
              <th className="py-2 px-3">Team</th>
              <th className="py-2 px-3">Pos</th>
              <th className="py-2 px-3">Projected</th>
              <th className="py-2 px-3">Actual</th>
              <th className="py-2 px-3">Injury</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 px-3 text-white/60" colSpan={6}>
                  No data yet for week {week} ({seasonType}). Try a different week/type.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-2 px-3 whitespace-nowrap">{r.name}</td>
                  <td className="py-2 px-3">{r.team || "-"}</td>
                  <td className="py-2 px-3">{r.position || "-"}</td>
                  <td className="py-2 px-3">{r.proj.toFixed(1)}</td>
                  <td className="py-2 px-3">{r.actual.toFixed(1)}</td>
                  <td className="py-2 px-3">{r.injury || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ---------- helpers ---------- */

function toArray(x: any): StatEntry[] {
  return Array.isArray(x) ? (x as StatEntry[]) : [];
}

function toArrayFromStats(x: any): StatEntry[] {
  if (Array.isArray(x)) return x as StatEntry[];
  if (x && typeof x === "object") {
    return Object.entries(x).map(([player_id, v]: [string, any]) => ({
      player_id,
      stats: v?.stats ?? v,
    }));
  }
  return [];
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizePos(raw?: string) {
  if (!raw) return undefined;
  const s = raw.toUpperCase().replace(/\s+/g, "");
  if (["QB", "RB", "WR", "TE", "K"].includes(s)) return s as any;
  if (["DST", "DEF", "D/ST", "DEFENSE"].includes(s)) return "DST" as any;
  return undefined;
}
