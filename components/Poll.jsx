"use client";

import { useEffect, useMemo, useState } from "react";

export default function Poll({ slug }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  const fetchUrl = useMemo(
    () => (slug ? `/api/poll/${encodeURIComponent(slug)}` : `/api/poll`),
    [slug]
  );

  async function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await fetch(fetchUrl, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `Failed (${res.status})`);
      setState({ loading: false, error: "", data: j.active });
    } catch (e) {
      setState({ loading: false, error: String(e?.message || e), data: null });
    }
  }

  useEffect(() => { load(); }, [fetchUrl]);

  if (state.loading) return <div className="text-white/70">Loading poll…</div>;
  if (state.error)   return <div className="text-red-400">Error: {state.error}</div>;
  if (!state.data)   return <div className="text-white/70">No poll to show.</div>;

  const { poll, results } = state.data;
  const total = results?.total || 0;
  const counts = results?.counts || [];
  const options = poll?.options || [];

  return (
    <div className="rounded-2xl border border-white/10 p-5">
      <h2 className="text-2xl font-semibold mb-4">{poll.question}</h2>

      <div className="space-y-3">
        {options.map((opt, i) => {
          const c = counts[i] || 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          return (
            <div key={i} className="rounded-xl border border-white/10 p-3">
              <div className="flex items-center justify-between text-lg mb-1">
                <span className="capitalize">{opt.label}</span>
              </div>
              <div className="h-2 rounded bg-white/10 overflow-hidden">
                <div
                  className="h-2 bg-white/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-white/60 mt-1">
                {c} vote{c === 1 ? "" : "s"} ({pct}%)
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-white/70 mt-4">
        Total votes: <span className="font-medium">{total}</span>
      </div>
    </div>
  );
}
