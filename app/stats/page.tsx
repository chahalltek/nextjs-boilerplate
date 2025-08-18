"use client";

import { useEffect, useState } from "react";

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

interface CombinedEntry {
  id: string;
  name: string;
  team?: string;
  position?: string;
  injury?: string;
  points: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

export default function StatsPage() {
  const [week, setWeek] = useState(1);
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [projections, setProjections] = useState<StatEntry[]>([]);
  const [actual, setActual] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Load player metadata once (names, positions, injuries)
  useEffect(() => {
    async function loadPlayers() {
      try {
        const res = await fetch("https://api.sleeper.app/v1/players/nfl");
        const data = await res.json();
        setPlayers(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadPlayers();
  }, []);

  // Load stats whenever week changes
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [projRes, actRes] = await Promise.all([
          fetch(`https://api.sleeper.app/projections/nfl/${CURRENT_YEAR}/${week}?season_type=regular`),
          fetch(`https://api.sleeper.app/stats/nfl/regular/${CURRENT_YEAR}/${week}`),
        ]);
        const proj = await projRes.json();
        const act = await actRes.json();
        setProjections(proj);
        setActual(act);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [week]);

  const combine = (data: StatEntry[]) =>
    data
      .map((d) => {
        const info: PlayerInfo = players[d.player_id] || {};
        const name = info.full_name || d.player_id;
        return {
          id: d.player_id,
          name,
          team: info.team,
          position: info.position,
          injury: info.injury_status,
          points: d.stats?.pts_ppr || 0,
        } as CombinedEntry;
      })
      .sort((a, b) => b.points - a.points);

  const projPlayers = combine(projections).filter((p) => p.position !== "DEF").slice(0, 20);
  const projDef = combine(projections).filter((p) => p.position === "DEF").slice(0, 20);
  const actualPlayers = combine(actual).filter((p) => p.position !== "DEF").slice(0, 20);
  const actualDef = combine(actual).filter((p) => p.position === "DEF").slice(0, 20);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Weekly Stats - will go live when season starts</h1>

      <div className="mb-8 flex items-center gap-2">
        <label htmlFor="week" className="font-medium">
          Week:
        </label>
        <select
          id="week"
          className="bg-[#120F1E] border border-white/10 rounded px-2 py-1"
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
        >
          {WEEKS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        {loading && <span className="text-white/60">Loading…</span>}
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Projected Player Stats</h2>
        <StatTable data={projPlayers} />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Projected Defense Stats</h2>
        <StatTable data={projDef} />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Actual Player Stats</h2>
        <StatTable data={actualPlayers} />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Actual Defense Stats</h2>
        <StatTable data={actualDef} />
      </section>
    </main>
  );
}

function StatTable({ data }: { data: CombinedEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr className="border-b border-white/10 text-white/70">
            <th className="py-2 px-3">Player</th>
            <th className="py-2 px-3">Team</th>
            <th className="py-2 px-3">Pos</th>
            <th className="py-2 px-3">Pts (PPR)</th>
            <th className="py-2 px-3">Injury</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id} className="border-b border-white/5">
              <td className="py-2 px-3 whitespace-nowrap">{p.name}</td>
              <td className="py-2 px-3">{p.team || "-"}</td>
              <td className="py-2 px-3">{p.position || "-"}</td>
              <td className="py-2 px-3">{p.points.toFixed(1)}</td>
              <td className="py-2 px-3">{p.injury || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
