"use client";

import { useState } from "react";

type Contestant = { id: string; name: string; tribe?: string; image?: string };
type Season = {
  id: string;
  name: string;
  lockAt: string;                 // ISO timestamp
  contestants: Contestant[];
  actualBootOrder: string[];      // filled weekly by admin
};

export default function BracketBuilder({
  season,
  locked,
}: {
  season: Season;
  locked: boolean;
}) {
  const [order, setOrder] = useState<string[]>(
    season.contestants.map((c) => c.id)
  );
  const [final3, setFinal3] = useState<string[]>(
    order.slice(-3).reverse() // [winner, second, third]
  );
  const [name, setName] = useState("");

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const copy = order.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setOrder(copy);
  }

  async function submit() {
    const res = await fetch("/api/survivor/entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId: season.id,
        name,
        picks: { bootOrder: order, final3 },
      }),
    });
    if (!res.ok) {
      alert("Submit failed");
      return;
    }
    window.location.href = "/survivor/leaderboard";
  }

  const byId = new Map(season.contestants.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <ol className="rounded-xl border border-white/10 divide-y divide-white/10">
        {order.map((id, i) => {
          const c = byId.get(id)!;
          return (
            <li key={id} className="flex items-center justify-between gap-3 p-2">
              <span className="text-sm opacity-70 w-8">{i + 1}.</span>
              <span className="flex-1">{c.name}</span>
              {!locked && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-2">
        <label className="text-sm opacity-80">
          Final 3 (Winner → Second → Third)
        </label>
