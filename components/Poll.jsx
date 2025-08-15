// components/Poll.jsx
"use client";

import { useEffect, useState } from "react";
import HyvorComments from "@/components/HyvorComments";

export default function Poll({ slug: explicitSlug }) {
  const [state, setState] = useState({ loading: true, error: "", poll: null, results: null });
  const [voting, setVoting] = useState(false);
  const slug = explicitSlug || null;

  const fetcher = async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const url = slug ? `/api/polls/${encodeURIComponent(slug)}` : "/api/polls/active";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Load failed (${res.status})`);
      const pkt = slug ? data : data.active;
      setState({ loading: false, error: "", poll: pkt?.poll || null, results: pkt?.results || null });
    } catch (e) {
      setState({ loading: false, error: String(e?.message || e), poll: null, results: null });
    }
  };

  useEffect(() => { fetcher(); /* eslint-disable-next-line */ }, [explicitSlug]);

  async function onVote(i) {
    if (!state.poll) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/polls/${encodeURIComponent(state.poll.slug || state.poll?.slug || state.poll?.question?.slug || state.poll?.id || (explicitSlug || ""))}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: i }),
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
  if (state.error) return <div className="card p-6 text-red-300">Error: {state.error}</div>;
  if (!state.poll) return <div className="card p-6">No active polls right now.</div>;

  const { question, options } = state.poll;
  const counts = state.results?.counts || new Array(options.length).fill(0);
  const total = state.results?.total || 0;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-xl font-semibold">{question}</h3>
        <div className="mt-4 space-y-3">
          {options.map((opt, i) => {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
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
                  <div className="h-2" style={{ width: `${pct}%`, background: "var(--color-skol-gold, #FFC62F)" }} />
                </div>
                <div className="px-3 py-1 text-xs text-white/70">{counts[i]} vote{counts[i] === 1 ? "" : "s"} ({pct}%)</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-sm text-white/70">Total votes: {total}</div>
      </div>

      {/* Per-poll comments */}
      <div className="card p-6">
        <h4 className="font-semibold mb-2">Join the conversation</h4>
        <HyvorComments pageId={`poll:${state.poll.slug || explicitSlug || "active"}`} title={question} />
      </div>
    </div>
  );
}
