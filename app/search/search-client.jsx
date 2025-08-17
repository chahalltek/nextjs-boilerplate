"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function SearchClient() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]); // [{type,title,slug,url,date,excerpt}]

  // Fetch with debounce
  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setErr("");
      return;
    }

    setLoading(true);
    setErr("");

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [q]);

  const grouped = useMemo(() => {
    const by = { posts: [], recaps: [] };
    for (const r of results) {
      if (r.type === "post") by.posts.push(r);
      else if (r.type === "recap") by.recaps.push(r);
    }
    return by;
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <input
          className="input w-full text-base"
          placeholder="Search posts and recaps… (min 2 characters)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="mt-2 text-xs text-white/50">
          Tip: try player names, topics, or week numbers (e.g., “week 3”).
        </div>
      </div>

      {loading && <div className="text-white/70">Searching…</div>}
      {err && <div className="text-red-400">Error: {err}</div>}

      {!loading && !err && q.trim().length >= 2 && results.length === 0 && (
        <div className="text-white/60">No results for “{q.trim()}”.</div>
      )}

      {/* Blog Posts */}
      {grouped.posts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Blog posts</h2>
          <div className="grid gap-3">
            {grouped.posts.map((r) => (
              <Link
                key={`post-${r.slug}`}
                href={r.url}
                className="card p-4 block hover:bg-white/5"
              >
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="uppercase tracking-wide">POST</span>
                  {r.date && <span>• {r.date}</span>}
                </div>
                <div className="mt-1 font-medium">{r.title}</div>
                {r.excerpt && (
                  <div className="mt-1 text-sm text-white/70 line-clamp-2">{r.excerpt}</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Weekly Recaps */}
      {grouped.recaps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Weekly recaps</h2>
          <div className="grid gap-3">
            {grouped.recaps.map((r) => (
              <Link
                key={`recap-${r.slug}`}
                href={r.url}
                className="card p-4 block hover:bg-white/5"
              >
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="uppercase tracking-wide">RECAP</span>
                  {r.date && <span>• {r.date}</span>}
                </div>
                <div className="mt-1 font-medium">{r.title}</div>
                {r.excerpt && (
                  <div className="mt-1 text-sm text-white/70 line-clamp-2">{r.excerpt}</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
