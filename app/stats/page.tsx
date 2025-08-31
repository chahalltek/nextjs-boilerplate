"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------------- types ---------------- */
type SeasonType = "pre" | "regular";
type Role = "ALL" | "OFF" | "DEF";
type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "OTHER" | "ALL";

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
  pts_ppr?: number; // sometimes top-level
}

interface CombinedRow {
  id: string;
  name: string;
  team?: string;
  position: Position;
  injury?: string;
  proj: number;
  actual: number;
  role: "OFF" | "DEF";
}

/* ---------------- consts ---------------- */
const CURRENT_YEAR = new Date().getFullYear();
const MAX_WEEKS: Record<SeasonType, number> = { pre: 4, regular: 18 };
const weeksFor = (t: SeasonType) =>
  Array.from({ length: MAX_WEEKS[t] }, (_, i) => i + 1);

/* ---------------- page ---------------- */
export default function StatsPage() {
  // NEW: season type switch (default to preseason)
  const [seasonType, setSeasonType] = useState<SeasonType>("pre");
  const [week, setWeek] = useState(1);

  // data
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [projections, setProjections] = useState<StatEntry[]>([]);
  const [actual, setActual] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [role, setRole] = useState<Role>("ALL");
  const [pos, setPos] = useState<Position | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"proj" | "actual" | "delta">("proj");
  const [limit, setLimit] = useState(50);

  // Clamp week if seasonType changes
  useEffect(() => {
    if (week > MAX_WEEKS[seasonType]) setWeek(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonType]);

  /* ----- players meta once ----- */
  useEffect(() => {
    async function loadPlayers() {
      try {
        const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
          cache: "no-store",
        });
        const data = (await res.json()) as Record<string, PlayerInfo>;
        setPlayers(data || {});
      } catch (err) {
        console.error("players load err", err);
      }
    }
    loadPlayers();
  }, []);

  async function fetchWeek() {
    setLoading(true);
    try {
      const projUrl = `https://api.sleeper.app/projections/nfl/${CURRENT_YEAR}/${week}?season_type=${seasonType}`;
      const actUrl = `https://api.sleeper.app/stats/nfl/${seasonType}/${CURRENT_YEAR}/${week}`;

      const [projRes, actRes] = await Promise.all([
        fetch(projUrl, { cache: "no-store" }),
        fetch(actUrl, { cache: "no-store" }),
      ]);

      const projJson = await projRes.json();
      const actJson = await actRes.json();

      setProjections(Array.isArray(projJson) ? projJson : []);

      // Actuals may be a map keyed by player_id → normalize
      const actArr: StatEntry[] = Array.isArray(actJson)
        ? actJson
        : Object.entries<Record<string, number>>(actJson || {}).map(
            ([player_id, stats]) => ({ player_id, stats })
          );

      setActual(actArr);
    } catch (err) {
      console.error("weekly load err", err);
      setProjections([]);
      setActual([]);
    } finally {
      setLoading(false);
    }
  }

  /* ----- load whenever week or seasonType changes ----- */
  useEffect(() => {
    fetchWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, seasonType]);

  /* ----- combine proj + actual into one list ----- */
  const rows: CombinedRow[] = useMemo(() => {
    const actualById = new Map(actual.map((r) => [r.player_id, r]));
    const ids = new Set<string>([
      ...projections.map((r) => r.player_id),
      ...actual.map((r) => r.player_id),
    ]);

    const out: CombinedRow[] = [];
    for (const id of ids) {
      const proj = projections.find((r) => r.player_id === id);
      const act = actualById.get(id);
      const meta = players[id] || ({} as PlayerInfo);

      const rawPos = (meta.position || "").toUpperCase();
      const position: Position =
        rawPos === "QB" ||
        rawPos === "RB" ||
        rawPos === "WR" ||
        rawPos === "TE" ||
        rawPos === "K"
          ? (rawPos as Position)
          : rawPos === "DEF" || rawPos === "DST"
          ? "DEF"
          : "OTHER";

      const role: "OFF" | "DEF" = position === "DEF" ? "DEF" : "OFF";

      out.push({
        id,
        name: meta.full_name || id,
        team: meta.team,
        position,
        injury: meta.injury_status,
        proj: num(proj?.stats?.pts_ppr ?? proj?.pts_ppr),
        actual: num(act?.stats?.pts_ppr ?? act?.pts_ppr),
        role,
      });
    }
    return out;
  }, [projections, actual, players]);

  /* ----- filtered + sorted view ----- */
  const view = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (role !== "ALL" && r.role !== role) return false;
      if (pos !== "ALL") {
        if (pos === "DEF") {
          if (r.position !== "DEF") return false;
        } else if (pos !== r.position) {
          return false;
        }
      }
      if (qlc) {
        const hay = `${r.name} ${r.team || ""} ${r.position}`.toLowerCase();
        if (!hay.includes(qlc)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "proj") return b.proj - a.proj;
      if (sortBy === "actual") return b.actual - a.actual;
      const da = a.proj - a.actual;
      const db = b.proj - b.actual;
      return Math.abs(db) - Math.abs(da);
    });

    return sorted.slice(0, limit);
  }, [rows, role, pos, q, sortBy, limit]);

  const weekOptions = weeksFor(seasonType);

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">
          Weekly Stats ({seasonType === "pre" ? "Preseason" : "Regular"} • Actual + Projected)
        </h1>
        <p className="text-xs text-white/70">
          Sleeper data. If games haven’t been played yet, “Actual” will be 0.
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-white/70">Season:</label>
        <select
          className="bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
          value={seasonType}
          onChange={(e) => setSeasonType(e.target.value as SeasonType)}
        >
          <option value="pre">Pre Season</option>
          <option value="regular">Regular Season</option>
        </select>

        <label className="ml-2 text-sm text-white/70">Week:</label>
        <select
          className="bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
        >
          {weekOptions.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        {loading && <span className="text-xs text-white/60">Loading…</span>}

        <span className="mx-2 h-6 w-px bg-white/10" />

        <label className="text-sm text-white/70">Role:</label>
        <select
          className="bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="ALL">All</option>
          <option value="OFF">Offense</option>
          <option value="DEF">Defense</option>
        </select>

        <label className="ml-2 text-sm text-white/70">Pos:</label>
        <select
          className="bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
          value={pos}
          onChange={(e) => setPos(e.target.value as Position | "ALL")}
        >
          {["ALL", "QB", "RB", "WR", "TE", "K", "DEF"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="ml-2 text-sm text-white/70">Sort:</label>
        <select
          className="bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "proj" | "actual" | "delta")}
        >
          <option value="proj">Projection</option>
          <option value="actual">Actual</option>
          <option value="delta">Δ |Proj-Actual|</option>
        </select>

        <label className="ml-2 text-sm text-white/70">Top:</label>
        <input
          type="number"
          min={10}
          max={200}
          className="w-20 bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        />

        <input
          className="ml-auto w-52 bg-[#120F1E] border border-white/10 rounded px-2 py-1 text-sm"
          placeholder="Search name/team…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <button
          type="button"
          onClick={fetchWeek}
          className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <StatTable data={view} />
    </main>
  );
}

/* ---------------- table ---------------- */
function StatTable({ data }: { data: CombinedRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr className="border-b border-white/10 text-white/70">
            <th className="py-2 px-3">Player</th>
            <th className="py-2 px-3">Team</th>
            <th className="py-2 px-3">Pos</th>
            <th className="py-2 px-3">Proj</th>
            <th className="py-2 px-3">Actual</th>
            <th className="py-2 px-3">Δ</th>
            <th className="py-2 px-3">Injury</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="py-4 px-3 text-white/60" colSpan={7}>
                No data yet for the selected filters.
              </td>
            </tr>
          ) : (
            data.map((r) => {
              const delta = r.proj - r.actual;
              return (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-2 px-3 whitespace-nowrap">{r.name}</td>
                  <td className="py-2 px-3">{r.team || "-"}</td>
                  <td className="py-2 px-3">{r.position}</td>
                  <td className="py-2 px-3">{r.proj.toFixed(1)}</td>
                  <td className="py-2 px-3">{r.actual.toFixed(1)}</td>
                  <td className={`py-2 px-3 ${deltaClass(delta)}`}>
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)}
                  </td>
                  <td className="py-2 px-3">{r.injury || "-"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- utils ---------------- */
function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function deltaClass(d: number) {
  if (Math.abs(d) < 0.2) return "text-white/60";
  return d > 0 ? "text-emerald-400" : "text-rose-400";
}
