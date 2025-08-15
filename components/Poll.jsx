"use client";

import { useEffect, useState } from "react";
import HyvorComments from "@/components/HyvorComments";

function coerceActiveShape(data) {
  // Accept either { ok, poll, results } OR { ok, active: { poll, results } }
  if (!data || typeof data !== "object") return { poll: null, results: null };
  if (data.poll) return { poll: data.poll, results: data.results ?? null };
  if (data.active) {
    const a = data.active || {};
    return { poll: a.poll ?? null, results: a.results ?? null };
  }
  return { poll: null, results: null };
}

export default function Poll({ slug: explicitSlug }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    poll: null,
    results: null,
  });
  const [voting, setVoting] = useState(false);

  async function load(slugArg) {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const url = slugArg
        ? `/api/polls/${encodeURIComponent(slugArg)}`
        : "/api/polls/active";

      const res = await fetch(url, { cache: "no-store" });
      // If the API returns HTML on error, json() will throw—catch below.
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data?.error || `Load failed (${res.status})`);
      }

      const { poll, results } = coerceActiveShape(data);
      if (!poll || !Array.isArray(poll.options) || poll.options.length < 2) {
        throw new Error("Poll data is invalid (missing options).");
      }

      setState({
        loading: false,
        error: "",
        poll,
        results: results || { counts: new Array(poll.options.length).fill(0), total: 0 },
      });
    } catch (e) {
      setState({
        loading: false,
        error: String(e?.message || e),
        poll: null,
        results: null,
      });
    }
  }

  useEffect(() => {
    load(explicitSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explicitSlug]);

  async function onVote(index) {
    const voteSlug = explicitSlug ?? state.poll?.slug;
    if (!state.poll || voteSlug == null) return;

    setVoting(true);
    try {
      const res = await fetch(`/api/polls/${encodeURIComponent(voteSlug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Vote failed (${res.status})`);
      setState((s) => ({ ...s, results: data.results }));
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setVoting(false);
    }
  }

  if (state.loading) return <div className="card p-6">Loading poll…</div>;
  if (state.error) {
    return (
      <div className="card p-6 text-red-300">
        <div className="font-semibold">Error loading poll</div>
        <div className="text-sm mt-1">{state.error}</div>
      </div>
    );
  }
  if (!state.poll) return <div className="card p-6">No active polls right now.</div>;

  const { question, options = [], slug } = state.poll;
  const safeOptions = Array.isArray(options) ? options : [];
  const counts =
    Array.isArray(state.results?.counts) && state.results?.counts.length === safeOptions.length
      ? state.results.counts
      : new Array(safeOptions.length).fill(0);
  const total = Number.isFinite(state.results?.total) ? state.results.total : counts.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-xl font-semibold">{question}</h3>
        <div className="mt-4 space-y-3">
          {safeOptions.map((opt, i) => {
            const votes = Number.isFinite(counts[i]) ? counts[i] : 0;
            const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
            return (
              <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => onVote(i)}
                  disabled={voting}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 disabled:opacity-50"
                >
                  {opt}
                </button>
                <div className="h-2 bg-white/10">
                  <div
                    className="h-2"
                    style={{ width: `${pct}%`, background: "var(--color-skol-gold, #FFC62F)" }}
                  />
                </div>
                <div className="px-3 py-1 text-xs text-white/70">
                  {votes} vote{votes === 1 ? "" : "s"} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-sm text-white/70">Total votes: {total}</div>
      </div>

      <div className="card p-6">
        <h4 className="font-semibold mb-2">Join the conversation</h4>
        {/* Safe even if Hyvor fails — component just renders nothing */}
        <HyvorComments pageId={`poll:${explicitSlug ?? slug ?? "active"}`} title={question} />
      </div>
    </div>
  );
}
