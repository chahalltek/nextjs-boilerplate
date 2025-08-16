"use client";

import { useEffect, useMemo, useState } from "react";
import HyvorComments from "@/components/HyvorComments";

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}

export default function SurvivorClient() {
  const [polls, setPolls] = useState([]);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [votePosting, setVotePosting] = useState(false);
  const [error, setError] = useState("");

  // Load all (active) polls
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingList(true);
      setError("");
      try {
        const r = await fetch("/api/polls", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || `Failed to load polls (${r.status})`);
        const list = Array.isArray(j.polls) ? j.polls : [];
        if (!cancelled) {
          setPolls(list);
          // auto-select first one if none yet
          if (!selected && list.length) selectPoll(list[0]);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    load();
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectPoll(poll) {
    setSelected(poll);
    setResults(null);
    if (!poll?.slug) return;
    setLoadingPoll(true);
    setError("");
    try {
      const r = await fetch(`/api/polls/${encodeURIComponent(poll.slug)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `Failed to load poll (${r.status})`);
      setResults(j.results || { counts: new Array((poll.options || []).length).fill(0), total: 0 });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoadingPoll(false);
    }
  }

  // Simple "has voted" guard per poll using localStorage
  const votedKey = selected ? `skol_vote_${selected.slug}` : null;
  const hasVoted = useMemo(() => {
    if (!votedKey) return false;
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(votedKey);
  }, [votedKey]);

  async function castVote(index) {
    if (!selected?.slug || votePosting) return;
    setVotePosting(true);
    setError("");
    try {
      // Prefer /api/polls/[slug]/vote; fall back to POST on /api/polls/[slug]
      let r = await fetch(`/api/polls/${encodeURIComponent(selected.slug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      if (r.status === 404) {
        r = await fetch(`/api/polls/${encodeURIComponent(selected.slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index }),
        });
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `Vote failed (${r.status})`);
      // Save local "voted" marker and refresh results
      if (typeof window !== "undefined" && votedKey) localStorage.setItem(votedKey, "1");
      await selectPoll(selected);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setVotePosting(false);
    }
  }

  function percent(count, total) {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: all active polls */}
      <section className="rounded-2xl border border-white/10 bg-white/5">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-2xl font-semibold text-white">All polls</h2>
        </div>

        {loadingList ? (
          <div className="p-6 text-white/60">Loading…</div>
        ) : error ? (
          <div className="p-6 text-red-400">Error: {error}</div>
        ) : polls.length === 0 ? (
          <div className="p-6 text-white/60">No polls yet.</div>
        ) : (
          <ul className="p-3 space-y-3">
            {polls.map((p) => (
              <li key={p.slug}>
                <button
                  onClick={() => selectPoll(p)}
                  className={classNames(
                    "w-full text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-4",
                    selected?.slug === p.slug ? "ring-1 ring-white/20" : ""
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-medium truncate">{p.question}</div>
                    {p.active && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <span className="inline-block size-2 rounded-full bg-emerald-400" />
                        active
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-white/50">slug: {p.slug}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* RIGHT: selected poll + results + comments + page content */}
      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-2xl font-semibold text-white">
            {selected ? selected.question : "Select a poll from the list."}
          </h2>
        </div>

        {!selected ? (
          <div className="p-6 text-white/60">Choose a poll on the left to view and vote.</div>
        ) : loadingPoll ? (
          <div className="p-6 text-white/60">Loading poll…</div>
        ) : (
          <>
            {/* Vote or results */}
            <div className="p-6 space-y-4">
              {(selected.options || []).map((opt, i) => {
                const c = results?.counts?.[i] ?? 0;
                const pct = percent(c, results?.total ?? 0);
                return (
                  <div key={i} className="rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-white">{opt.label || `Option ${i + 1}`}</div>
                      {!hasVoted && (
                        <button
                          onClick={() => castVote(i)}
                          disabled={votePosting}
                          className="ml-4 inline-flex items-center rounded-md bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 border border-white/20 disabled:opacity-50"
                          title="Cast vote"
                        >
                          {votePosting ? "…" : "Vote"}
                        </button>
                      )}
                    </div>
                    {/* bar */}
                    <div className="mt-3 h-2 rounded bg-white/10 overflow-hidden">
                      <div
                        className="h-2 rounded bg-white/70"
                        style={{ width: `${pct}%` }}
                        aria-label={`${pct}%`}
                      />
                    </div>
                    <div className="mt-2 text-sm text-white/60">
                      {c} votes ({pct}%)
                    </div>
                  </div>
                );
              })}

              <div className="text-white/80 font-medium">
                Total votes: {results?.total ?? 0}
              </div>
              {hasVoted ? (
                <div className="text-sm text-emerald-400">Thanks! Your vote has been counted.</div>
              ) : (
                <div className="text-sm text-white/60">
                  Cast a vote to see how your pick stacks up in real time.
                </div>
              )}
              {error && <div className="text-sm text-red-400">Error: {error}</div>}
            </div>

            {/* Comments / Reactions */}
            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 text-white font-semibold">
                  Join the conversation
                </div>
                <div className="p-4 bg-black/10">
                  {/* pageId ensures each poll has its own thread */}
                  <HyvorComments pageId={`poll:${selected.slug}`} />
                </div>
              </div>
            </div>

            {/* Educational / fun content */}
            <div className="px-6 pb-10 space-y-10">
              <section className="prose prose-invert max-w-none">
                <h3>What is <em>Survivor</em> (and why do fantasy-football folks love it)?</h3>
                <p>
                  <em>Survivor</em> is basically fantasy football on a beach with fewer helmets and
                  way more coconuts. You draft favorites (mentally), track performance, argue about
                  strategy, and celebrate the one brilliant move that makes everyone else salty.
                </p>
                <ul>
                  <li><strong>Alliances</strong> ≈ your trade partners.</li>
                  <li><strong>Hidden Idols</strong> ≈ waiver-wire steals.</li>
                  <li><strong>Tribal Council</strong> ≈ league-chat pile-ons after a bad start.</li>
                </ul>
                <p>
                  If you like game theory, social reads, and the smug joy of saying “told you so,”
                  <em> Survivor</em> scratches the exact same itch—our community (especially
                  women who run their leagues like GMs) tends to be die-hard for both.
                </p>
              </section>

              <section className="prose prose-invert max-w-none">
                <h3>Survivor in 60 seconds (the rules you actually care about)</h3>
                <ul>
                  <li><strong>Tribes &amp; challenges:</strong> win rewards and immunity.</li>
                  <li><strong>Tribal Council:</strong> losing tribe votes someone out; idols twist outcomes.</li>
                  <li><strong>Merge &amp; Jury:</strong> merge mid-game, Jury crowns the winner.</li>
                  <li><strong>Finale:</strong> final three, fire-making tiebreakers, plead your case.</li>
                  <li><strong>“New Era” pace:</strong> 26-day sprint, more advantages, weekly chaos.</li>
                </ul>
              </section>

              <section className="prose prose-invert max-w-none">
                <h3>This season at a glance</h3>
                <p>
                  CBS keeps the Wednesday night rhythm; the exact premiere date gets announced late
                  summer. We’ll update this box (and our first poll) as soon as the date is official.
                  Expect the 26-day format, idols, crafty advantages, and a merge that turns the game
                  into beautiful chaos.
                </p>
              </section>

              <section className="prose prose-invert max-w-none">
                <h3>How to play along here</h3>
                <ol>
                  <li>Select a poll on the left (each week or special).</li>
                  <li>Cast your vote—one click and you’re in the mix.</li>
                  <li>Talk your talk: react or comment (be witty, be kind, no spoilers without tags).</li>
                  <li>Come back after Tribal for live percentages and victory-lap rights.</li>
                </ol>
              </section>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
