// app/survivor-client.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import HyvorComments from "@/components/HyvorComments";

const keyFor = (slug) => `poll:${slug}:voted`;

export default function SurvivorClient() {
  const [polls, setPolls] = useState([]);        // [{ slug, question, options: [{label}], active, results? }]
  const [selected, setSelected] = useState(null); // slug
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedPoll = useMemo(
    () => polls.find((p) => p.slug === selected) || null,
    [polls, selected]
  );

  const fetchPolls = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer an endpoint that returns ALL active polls with results.
      // If your /api/polls returns { polls: [...] }, use it.
      // If it returns { active: {...} }, adapt below.
      const res = await fetch("/api/polls?active=1", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      let list = [];
      if (Array.isArray(data.polls)) {
        list = data.polls;
      } else if (data.active?.poll) {
        // Back-compat with earlier single-poll response
        list = [data.active.poll];
      }

      // If results are not included, fetch them per poll (small N)
      const withResults = await Promise.all(
        list.map(async (p) => {
          if (p.results && Array.isArray(p.results.counts)) return p;
          try {
            const r = await fetch(`/api/polls/${encodeURIComponent(p.slug)}`, {
              cache: "no-store",
            });
            const dj = await r.json().catch(() => ({}));
            return dj?.poll ? dj.poll : p;
          } catch {
            return p;
          }
        })
      );

      setPolls(withResults);
      // Preserve selection if present
      setSelected((prev) => prev || withResults[0]?.slug || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Cast a vote
  async function vote(optionIndex) {
    if (!selectedPoll) return;
    const already = localStorage.getItem(keyFor(selectedPoll.slug));
    if (already) return; // UI is also disabled — double safety

    setSaving(true);
    try {
      const res = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedPoll.slug, optionIndex }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Vote failed");
      }
      localStorage.setItem(keyFor(selectedPoll.slug), "1");
      // Refresh just the selected poll’s results
      await refreshSelected();
    } catch (e) {
      // soft fail — could add a toast
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const refreshSelected = useCallback(async () => {
    if (!selected) return;
    try {
      const r = await fetch(`/api/polls/${encodeURIComponent(selected)}`, {
        cache: "no-store",
      });
      const dj = await r.json().catch(() => ({}));
      if (dj?.poll) {
        setPolls((curr) =>
          curr.map((p) => (p.slug === selected ? dj.poll : p))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, [selected]);

  // Helpers
  const hasVoted = selectedPoll && localStorage.getItem(keyFor(selectedPoll.slug));
  const total = selectedPoll?.results?.total ?? 0;
  const counts = selectedPoll?.results?.counts ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT: poll list */}
      <div className="card p-4 md:p-6">
        <h2 className="text-2xl font-semibold mb-4">All polls</h2>

        {loading && <div className="text-white/60">Loading…</div>}
        {!loading && polls.length === 0 && (
          <div className="text-white/60">No polls yet.</div>
        )}

        <div className="flex flex-col gap-3">
          {polls.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelected(p.slug)}
              className={`w-full text-left rounded-2xl border px-4 py-3 transition
                ${selected === p.slug
                  ? "border-white/30 bg-white/5"
                  : "border-white/10 hover:border-white/20"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{p.question}</div>
                {p.active && (
                  <span className="inline-flex items-center gap-2 text-xs text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    active
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: selected poll */}
      <div className="card p-4 md:p-6">
        {selectedPoll ? (
          <>
            <h2 className="text-2xl font-semibold">{selectedPoll.question}</h2>

            {/* Options — tap to vote (disabled if already voted) */}
            <div className="mt-4 space-y-3">
              {selectedPoll.options?.map((opt, idx) => {
                const c = counts[idx] || 0;
                const pct = total > 0 ? Math.round((c / total) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{opt.label}</div>
                      <button
                        disabled={!!hasVoted || saving}
                        onClick={() => vote(idx)}
                        className={`px-3 py-1.5 rounded-xl text-sm border
                          ${hasVoted
                            ? "opacity-50 cursor-not-allowed border-white/10"
                            : "border-white/20 hover:border-white/40"}
                        `}
                      >
                        {hasVoted ? "Voted" : "Vote"}
                      </button>
                    </div>

                    {/* result bar */}
                    <div className="mt-2 h-2 rounded bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-white/70"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {c} {c === 1 ? "vote" : "votes"} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-sm text-white/70">
              Total votes: {total}
            </div>

            {/* Comments */}
            <div className="mt-10">
              <HyvorComments pageId={`poll:${selectedPoll.slug}`} />
            </div>
          </>
        ) : (
          <div className="text-white/60">Select a poll from the list.</div>
        )}
      </div>
    </div>
  );
}
