"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerSearch from "@/components/PlayerSearch";

type Lineup = {
  week: number;
  slots: Record<string, string[]>;
  bench?: string[];
  details?: Record<
    string,
    {
      playerId: string;
      position: string;
      points: number;
      confidence: number;
      tier: "A" | "B" | "C" | "D";
      note?: string;
    }
  >;
};

type PlayerHit = { id: string; label: string; name?: string; team?: string; position?: string };

export default function RosterHome() {
  const [id, setId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({}); // id -> "Name — TEAM POS"
  const [pinsFlex, setPinsFlex] = useState<Record<string, boolean>>({});
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [optInEmail, setOptInEmail] = useState(true);

  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState(1);
  const [recommendation, setRecommendation] = useState<Lineup | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  // ---------------- helpers: label resolution ----------------
  async function fetchLabelForId(pid: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(pid)}&limit=1`, {
        cache: "no-store",
      });
      const data = await res.json();
      const hit: PlayerHit | undefined = data?.hits?.[0];
      return hit?.label ?? null;
    } catch {
      return null;
    }
  }

  async function ensureLabels(ids: string[]) {
    const missing = ids.filter((pid) => !labels[pid]);
    if (!missing.length) return;
    const results = await Promise.all(missing.map((pid) => fetchLabelForId(pid)));
    const add: Record<string, string> = {};
    missing.forEach((pid, i) => {
      if (results[i]) add[pid] = results[i] as string;
    });
    if (Object.keys(add).length) setLabels((prev) => ({ ...prev, ...add }));
  }

  function addPlayer(pid: string, label?: string) {
    if (!pid) return;
    setPlayers((prev) => (prev.includes(pid) ? prev : [...prev, pid]));
    if (label) setLabels((prev) => (prev[pid] ? prev : { ...prev, [pid]: label }));
    else ensureLabels([pid]);
  }

  function removePlayer(pid: string) {
    setPlayers((prev) => prev.filter((p) => p !== pid));
    setPinsFlex((prev) => {
      const next = { ...prev };
      delete next[pid];
      return next;
    });
  }

  function toggleFlexPin(pid: string) {
    setPinsFlex((prev) => ({ ...prev, [pid]: !prev[pid] }));
  }

  function applyPaste() {
    const ids = pasteText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setPlayers((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      // resolve labels for anything new
      const newIds = next.filter((pid) => !labels[pid]);
      ensureLabels(newIds);
      return next;
    });
    setPasteText("");
    setShowPaste(false);
  }

  // ---------------- lifecycle ----------------
  useEffect(() => {
    const stored = localStorage.getItem("rosterId");
    if (stored) setId(stored);
  }, []);

  // hydrate roster if we have an id
  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const res = await fetch(`/api/roster?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const r = data.roster || {};
        setEmail(r.email || "");
        setName(r.name || "");
        const ids: string[] = Array.isArray(r.players) ? r.players : [];
        setPlayers(ids);
        const flexPins = (r.pins?.FLEX as string[]) || [];
        setPinsFlex(Object.fromEntries(flexPins.map((p: string) => [p, true])));
        if (typeof r.optInEmail === "boolean") setOptInEmail(r.optInEmail);
        // resolve friendly labels for loaded ids
        ensureLabels(ids);
      } catch {}
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------- save / load recommendation ----------------
  async function save() {
    setSaving(true);
    try {
      const payload: any = {
        name,
        players,
        pins: { FLEX: Object.keys(pinsFlex).filter((k) => pinsFlex[k]) },
        optInEmail,
      };
      if (id) payload.id = id;
      else payload.email = email;

      const res = await fetch("/api/roster", { method: "POST", body: JSON.stringify(payload) });
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
    setLoadingRec(true);
    try {
      const res = await fetch(`/api/roster/recommendation?id=${id}&week=${week}`, { cache: "no-store" });
      const data = await res.json();
      setRecommendation(data.lineup || null);
    } finally {
      setLoadingRec(false);
    }
  }

  const hasPlayers = players.length > 0;

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Skol Coach — Lineup Lab</h1>
        <p className="text-white/70">
          Save your roster, pin players to FLEX if you like, and get weekly start/sit recommendations.
        </p>
      </header>

      {/* Explainer */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">What is Skol Coach?</h2>
        <p className="text-white/80 text-sm mt-2">
          Your weekly lineup consigliere. We blend data science (projections, injuries, opponent difficulty)
          with human overrides to get you the best combo of <em>art + science</em>.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="font-medium">How to use</div>
            <ul className="list-disc pl-5 text-white/70 mt-1 space-y-1">
              <li>Search and add your players by name (we’ll store their IDs under the hood).</li>
              <li>Save your roster once—update anytime for trades/waivers.</li>
              <li>Select the week and click <b>Get Recommendation</b>.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="font-medium">What you’ll get</div>
            <ul className="list-disc pl-5 text-white/70 mt-1 space-y-1">
              <li>A position-by-position starting lineup + bench.</li>
              <li>Confidence scores & rough tiers (A/B/C/D).</li>
              <li>Optional weekly email reminders with your lineup.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="font-medium">Multiple teams/leagues</div>
            <p className="text-white/70 mt-1">
              Managing more than one squad? Create a roster for each team (unique email/team name helps
              you keep them straight). You can pin players to FLEX and tweak your slot rules as needed.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="font-medium">Art + Science</div>
            <p className="text-white/70 mt-1">
              Projections, injuries, and matchups power the model; our admins can nudge calls when vibes
              or late news matter. If we override, you’ll see it reflected in the recommendation.
            </p>
          </div>
        </div>

        <p className="text-xs text-white/50 mt-3">
          Heads up: lineups refresh as projections and injuries update. You’ll get an email midweek with
          your recommended starters (and again if something meaningfully changes).
        </p>
      </section>

      {/* Create or edit */}
      <section className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        {!id && (
          <>
            <input
              className="rounded border border-white/10 bg-transparent px-3 py-2"
              placeholder="Email (for weekly lineup emails)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={optInEmail}
                onChange={(e) => setOptInEmail(e.target.checked)}
                className="rounded border-white/20 bg-transparent"
              />
              Send my lineup by email each week
            </label>
          </>
        )}

        <input
          className="rounded border border-white/10 bg-transparent px-3 py-2"
          placeholder="Team name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Player search + roster list */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/80">Add players</div>
            <button
              type="button"
              onClick={() => setShowPaste((s) => !s)}
              className="text-xs text-white/60 hover:text-white"
            >
              {showPaste ? "Hide quick paste" : "Quick paste IDs"}
            </button>
          </div>

          <PlayerSearch
            onSelect={(hit: PlayerHit) => addPlayer(hit.id, hit.label)}
            placeholder="Type a player name (e.g., Justin Jefferson)…"
          />

          {showPaste && (
            <div className="grid gap-2">
              <textarea
                className="rounded border border-white/10 bg-transparent px-3 py-2 min-h-24"
                placeholder="Space/comma/line separated player IDs"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button onClick={applyPaste} className="border border-white/20 rounded px-3 py-2 w-fit">
                Add from paste
              </button>
            </div>
          )}

          {/* Roster chips */}
          {hasPlayers ? (
            <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map((pid) => (
                <li
                  key={pid}
                  className="flex items-center justify-between rounded border border-white/10 bg-black/30 px-3 py-2"
                >
                  <span className="truncate text-sm">
                    {labels[pid] || pid}
                    <span className="ml-2 text-white/40 text-[11px]">({pid})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFlexPin(pid)}
                      className={`text-xs rounded px-2 py-1 border ${
                        pinsFlex[pid]
                          ? "border-[color:var(--skol-gold)] text-[color:var(--skol-gold)]"
                          : "border-white/20 text-white/70"
                      } hover:opacity-90`}
                      title="Pin to FLEX"
                    >
                      FLEX
                    </button>
                    <button
                      onClick={() => removePlayer(pid)}
                      className="text-xs rounded px-2 py-1 border border-white/20 text-white/70 hover:bg-white/10"
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/60">No players yet—add a few using the search above.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving} className="btn-gold w-fit">
            {saving ? "Saving…" : id ? "Save Changes" : "Create Roster"}
          </button>
          {id && (
            <span className="text-xs text-white/50">
              Roster ID: <code className="text-white/70">{id}</code>
            </span>
          )}
        </div>
      </section>

      {/* Recommendation */}
      {id && (
        <section className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm">Week</label>
            <input
              type="number"
              min={1}
              max={18}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="w-16 bg-transparent border border-white/10 rounded px-2 py-1"
            />
            <button onClick={loadRecommendation} className="btn-gold">
              {loadingRec ? "Loading…" : "Get Recommendation"}
            </button>
          </div>

          {recommendation && <RecommendationView lu={recommendation} />}
        </section>
      )}
    </main>
  );
}

/* ---------------- UI helpers ---------------- */

function RecommendationView({ lu }: { lu: Lineup }) {
  const order = useMemo(() => ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"], []);

  return (
    <div className="grid gap-3">
      <div className="text-white/80 text-sm">Recommended Lineup — Week {lu.week}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {order.map((slot) => (
          <div key={slot} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="text-xs uppercase tracking-wide text-white/60 mb-2">{slot}</div>
            {lu.slots?.[slot]?.length ? (
              <ul className="grid gap-1">
                {lu.slots[slot].map((pid) => {
                  const d = lu.details?.[pid];
                  return (
                    <li key={pid} className="flex items-center justify-between text-sm">
                      <span className="truncate">{pid}</span>
                      {d && (
                        <span className="text-xs text-white/60">
                          {d.points.toFixed(1)} pts · {Math.round(d.confidence * 100)}% · {d.tier}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-white/50">—</div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Bench</div>
        {lu.bench?.length ? (
          <div className="text-sm">{lu.bench.join(", ")}</div>
        ) : (
          <div className="text-sm text-white/50">—</div>
        )}
      </div>
    </div>
  );
}
