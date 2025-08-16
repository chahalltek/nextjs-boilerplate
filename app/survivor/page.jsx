// app/survivor/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";

const HYVOR_SITE_ID = 13899;
function loadHyvor(pageId) {
  const holder = document.getElementById("hyvor-talk-view");
  if (holder) holder.innerHTML = "";

  const scriptId = "hyvor-talk-script";
  const existing = document.getElementById(scriptId);
  if (existing) existing.remove();

  const s = document.createElement("script");
  s.id = scriptId;
  s.src = "https://talk.hyvor.com/web-api/embed.js";
  s.defer = true;
  s.async = true;
  s.setAttribute("data-website-id", String(HYVOR_SITE_ID));
  s.setAttribute("data-page-id", pageId);
  document.body.appendChild(s);
}

function getVoteCookie(slug) {
  if (typeof document === "undefined") return false;
  const name = `sv_voted_${slug}=`;
  return document.cookie.split("; ").some((c) => c.startsWith(name));
}

export default function SurvivorPage() {
  const [polls, setPolls] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selected, setSelected] = useState(null); // { poll, results }
  const [hasVoted, setHasVoted] = useState(false);
  const [choice, setChoice] = useState(-1);
  const [status, setStatus] = useState("");

  // load list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/poll", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!cancelled && j?.ok) {
        setPolls(j.polls || []);
        if (!selectedSlug && j.polls?.length) {
          setSelectedSlug(j.polls[0].slug);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // load selected poll
  useEffect(() => {
    if (!selectedSlug) return;
    let cancelled = false;
    (async () => {
      setStatus("");
      const r = await fetch(`/api/poll?slug=${encodeURIComponent(selectedSlug)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!cancelled && j?.ok) {
        setSelected(j);
        setChoice(-1);
        const voted = getVoteCookie(j.poll?.slug);
        setHasVoted(voted);
        loadHyvor(`poll:${j.poll?.slug}`);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSlug]);

  const selectedPageId = useMemo(
    () => (selected?.poll?.slug ? `poll:${selected.poll.slug}` : ""),
    [selected],
  );

  async function onVote(e) {
    e.preventDefault();
    if (!selected?.poll) return;
    if (choice < 0) { setStatus("Please select an option."); return; }
    setStatus("Submitting…");
    try {
      const res = await fetch("/api/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selected.poll.slug, choice }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Vote failed (${res.status})`);
      setSelected((old) => old ? { ...old, results: data.results } : old);
      setHasVoted(true);
      setStatus("Thanks for voting!");
    } catch (err) {
      setStatus(String(err?.message || err));
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold text-white mb-2">Survivor</h1>
      <p className="text-white/70 mb-8">
        Vote in the weekly poll and see live results.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: all active polls */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xl font-semibold mb-4">All polls</h2>
          {polls.length === 0 && <p className="text-white/60">No polls yet.</p>}
          <div className="flex flex-col gap-3">
            {polls.map((p) => {
              const active = p.slug === selectedSlug;
              return (
                <button
                  key={p.slug}
                  onClick={() => setSelectedSlug(p.slug)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition
                    ${active ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white">{p.question}</div>
                    {p.active && (
                      <span className="flex items-center gap-1 text-emerald-400 text-sm">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                        active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-white/50">slug: {p.slug}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: selected poll */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          {!selected?.poll ? (
            <p className="text-white/70">Select a poll from the list.</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">{selected.poll.question}</h2>

              {/* If not voted yet: show voting form */}
              {!hasVoted ? (
                <form onSubmit={onVote} className="space-y-4">
                  <div className="flex flex-col gap-3">
                    {selected.poll.options?.map((opt, idx) => (
                      <label
                        key={`${selected.poll.slug}-${idx}`}
                        className={`rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer
                          ${choice === idx ? "ring-2 ring-white/60" : ""}`}
                      >
                        <input
                          type="radio"
                          name="choice"
                          className="mr-3"
                          checked={choice === idx}
                          onChange={() => setChoice(idx)}
                        />
                        <span className="text-white">{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <button type="submit" className="btn-gold">
                    Submit vote
                  </button>

                  {status && <div className="text-sm text-white/70">{status}</div>}

                  <div className="text-xs text-white/40">
                    Results will show after you vote.
                  </div>
                </form>
              ) : (
                <>
                  {/* Results (visible after voting) */}
                  <div className="flex flex-col gap-4">
                    {selected.poll.options?.map((opt, idx) => {
                      const total = selected?.results?.total || 0;
                      const count = selected?.results?.counts?.[idx] || 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={`${selected.poll.slug}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-white mb-2">{opt.label}</div>
                          <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
                            <div className="h-2 bg-white/70" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-white/50 mt-2">
                            {count} votes ({pct}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-white/80 mt-4">
                    Total votes: {selected?.results?.total || 0}
                  </div>

                  {/* Hyvor reactions + comments */}
                  <div className="mt-8">
                    <div id="hyvor-talk-view" data-website-id={HYVOR_SITE_ID} data-page-id={selectedPageId} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
