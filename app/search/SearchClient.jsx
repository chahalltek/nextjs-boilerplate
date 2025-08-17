"use client";

import { useEffect, useMemo, useState } from "react";

export default function SearchClient() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ items: [], counts: {} });
  const [error, setError] = useState("");

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let abort = false;
    async function run() {
      setError("");
      if (!debounced) {
        setResults({ items: [], counts: {} });
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await res.json();
        if (!abort) {
          if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
          setResults(data);
        }
      } catch (e) {
        if (!abort) setError(e.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [debounced]);

  const grouped = useMemo(() => {
    const g = { post: [], recap: [], holdem: [] };
    for (const it of results.items || []) {
      if (g[it.type]) g[it.type].push(it);
    }
    return g;
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <label className="block text-sm text-white/70 mb-1">Search</label>
        <input
          className="input w-full"
          placeholder="Try: Jefferson, bye week, waiver, Survivor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="mt-2 text-xs text-white/50">
          {loading ? "Searching…" : debounced ? `Results for “${debounced}”` : "Type to search"}
        </div>
        {error && <div className="mt-2 text-sm text-red-400">Error: {error}</div>}
      </div>

      {/* Results */}
      {!!debounced && !loading && results.items?.length === 0 && (
        <div className="text-white/70">No matches. Try another term.</div>
      )}

      {["post", "recap", "holdem"].map((type) => {
        const label =
          type === "post" ? "Blog Posts" : type === "recap" ? "Weekly Recaps" : "Hold ’em / Fold ’em";
        const items = grouped[type] || [];
        if (items.length === 0) return null;
        return (
          <section key={type} className="space-y-3">
            <h2 className="text-lg font-semibold">{label}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((it) => (
                <li key={it.url} className="card p-4 hover:bg-white/5">
                  <a href={it.url} className="block">
                    <div className="text-xs text-white/50">{it.date}</div>
                    <div className="font-medium">{it.title}</div>
                    {it.excerpt && (
                      <div className="text-sm text-white/70 mt-1 line-clamp-3">{it.excerpt}</div>
                    )}
                    {it.match && (
                      <div className="text-xs text-white/50 mt-2">
                        Match in: {it.match.in} — <span className="italic">“…{it.match.snippet}…”</span>
                      </div>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
