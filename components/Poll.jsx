"use client";

import { useEffect, useState, useCallback } from "react";
import HyvorComments from "@/components/HyvorComments";

/**
 * Poll UI
 * - If `slug` prop is provided, loads that poll from /api/polls/[slug]
 * - Otherwise loads the currently active poll from /api/polls/active
 * - Accepts options as strings OR objects like { label: "..." }
 */
export default function Poll({ slug: explicitSlug }) {
  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState(null);          // { slug, question, options: (string[]|{label}[]) }
  const [results, setResults] = useState(null);    // { counts: number[], total: number }
  const [error, setError] = useState("");
  const [voting, setVoting] = useState(false);

  const fetchPoll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = explicitSlug
        ? `/api/polls/${encodeURIComponent(explicitSlug)}`
        : `/api/polls/active`;

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        const msg = data?.error || `Load failed (${res.status})`;
        throw new Error(msg);
      }

      // Support either /api/polls/active => { ok, active: { poll, results } }
      // or /api/polls/[slug] => { ok, poll, results }
      const gotPoll = data.active?.poll || data.poll;
      const gotResults = data.active?.results || data.results || { counts: [], total: 0 };

      setPoll(gotPoll);
      setResults(gotResults);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [explicitSlug]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  async function onVote(index) {
    if (!poll?.slug || voting) return;
    setVoting(true);
    try {
      // Adjust this path if your vote endpoint differs
      const res = await fetch(`/api/polls/${encodeURIComponent(poll.slug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ index }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data?.error || `Vote failed (${res.status})`);
      }
      // Refresh results after a successful vote
      await fetchPoll();
    } catch (e) {
      setError(`Vote error: ${String(e?.message || e)}`);
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse text-white/70">Loading poll…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-red-300">Error: {error}</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="card p-6">
        <div className="text-white/70">No poll found.</div>
      </div>
    );
  }

  const { slug, question } = poll;
  const safeOptions = Array.isArray(poll.options) ? poll.options : [];
  const counts = Array.isArray(results?.counts) ? results.counts : [];
  const total =
    typeof results?.total === "number"
      ? results.total
      : counts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  // Coerce each option to a display string
  const labels = safeOptions.map((o, i) => {
    if (typeof o === "string") return o;
    if (o && typeof o.label === "string") return o.label;
    return `Option ${i + 1}`;
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-xl font-semibold">{question}</h3>

        <div className="mt-4 space-y-3">
          {labels.map((text, i) => {
            const votes = Number.isFinite(counts[i]) ? counts[i] : 0;
            const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

            return (
              <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => onVote(i)}
                  disabled={voting}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 disabled:opacity-50"
                >
                  {text}
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
        <HyvorComments
          pageId={`poll:${explicitSlug ?? slug ?? "active"}`}
          title={question}
        />
      </div>
    </div>
  );
}
