"use client";
import { useEffect, useState } from "react";

export default function Poll({ poll }) {
  const [counts, setCounts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);

  useEffect(() => {
    fetch(`/api/polls/${poll.slug}`).then(r => r.json()).then(j => {
      if (j.ok) setCounts(j.counts || {});
    });
  }, [poll.slug]);

  async function vote(option) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/polls/${poll.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option })
      });
      const j = await r.json();
      if (!r.ok) alert(j.error || "Vote failed");
      else setCounts(j.counts || {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">{poll.title}</h2>
      <div className="grid gap-2">
        {poll.options.map((opt) => {
          const c = Number(counts[opt] || 0);
          const pct = total ? Math.round((c / total) * 100) : 0;
          return (
            <div key={opt} className="grid gap-1">
              <button
                onClick={() => vote(opt)}
                disabled={submitting || poll.status !== "open"}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-left"
              >
                {opt}
              </button>
              <div className="h-2 bg-white/10 rounded overflow-hidden">
                <div
                  className="h-full bg-[color:var(--skol-gold)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-white/60">{c} vote{c === 1 ? "" : "s"} ({pct}%)</div>
            </div>
          );
        })}
      </div>
      {total > 0 && <div className="text-sm text-white/60">Total: {total}</div>}
    </div>
  );
}
