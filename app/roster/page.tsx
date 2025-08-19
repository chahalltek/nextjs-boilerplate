"use client";

import { useEffect, useState } from "react";

export default function RosterHome() {
  const [id, setId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [playersText, setPlayersText] = useState(""); // comma/line separated player_ids
  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState(1);
  const [recommendation, setRecommendation] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("rosterId");
    if (stored) setId(stored);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const players = playersText
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/roster", {
        method: "POST",
        body: JSON.stringify(
          id
            ? { id, name, players }
            : { email, name, players }
        ),
      });
      const data = await res.json();
      if (data.roster?.id) {
        localStorage.setItem("rosterId", data.roster.id);
        setId(data.roster.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function loadRecommendation() {
    if (!id) return;
    const res = await fetch(`/api/roster/recommendation?id=${id}&week=${week}`);
    const data = await res.json();
    setRecommendation(data.lineup);
  }

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Skol Coach — Lineup Lab</h1>
        <p className="text-white/70">Save your roster and get weekly start/sit recommendations.</p>
      </header>

      {!id && (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <input className="rounded border border-white/10 bg-transparent px-3 py-2"
                 placeholder="Email (so we can send your weekly lineup)"
                 value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="rounded border border-white/10 bg-transparent px-3 py-2"
                 placeholder="Team name (optional)"
                 value={name} onChange={e=>setName(e.target.value)} />
          <textarea className="rounded border border-white/10 bg-transparent px-3 py-2 min-h-28"
                 placeholder="Paste your player IDs (Sleeper) or add them later"
                 value={playersText} onChange={e=>setPlayersText(e.target.value)} />
          <button onClick={save} disabled={saving}
                  className="btn-gold inline-flex w-fit">{saving ? "Saving…" : "Create Roster"}</button>
        </div>
      )}

      {id && (
        <section className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/70">Roster ID: <code>{id}</code></div>
          <textarea className="rounded border border-white/10 bg-transparent px-3 py-2 min-h-28"
                 placeholder="Edit your player IDs (space/comma separated)"
                 value={playersText} onChange={e=>setPlayersText(e.target.value)} />
          <button onClick={save} disabled={saving} className="border border-white/20 rounded px-3 py-2 w-fit">
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm">Week</label>
            <input type="number" min={1} max={18} value={week}
                   onChange={(e)=>setWeek(Number(e.target.value))}
                   className="w-16 bg-transparent border border-white/10 rounded px-2 py-1" />
            <button onClick={loadRecommendation} className="btn-gold">Get Recommendation</button>
          </div>

          {recommendation && (
            <div className="mt-3 grid gap-2">
              <div className="text-white/80 text-sm">Recommended Lineup</div>
              <pre className="text-xs bg-black/30 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(recommendation, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
