// app/search/SearchClient.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const TYPE_LABEL = {
  blog: "Blog",
  recap: "Weekly Recap",
  holdem: "Hold ’em / Fold ’em",
  poll: "Survivor",
};

const DEFAULT_FILTERS = { blog: true, recap: true, holdem: true, poll: true };

function norm(s) {
  return (s || "").toLowerCase();
}

function tokenize(q) {
  return norm(q).split(/[\s\-_/.,!?:;]+/).filter(Boolean);
}

// Tiny fuzzy-ish scorer: token substrings across title+excerpt
function scoreItem(item, tokens) {
  if (tokens.length === 0) return 0;
  const hay = `${item.title} ${item.excerpt}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) {
      score += 3;
      if (item.title.toLowerCase().includes(t)) score += 2;
      if (hay.startsWith(t)) score += 1;
    }
  }
  return score;
}

export default function SearchClient() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/search-index", { cache: "no-store" });
        const j = await r.json();
        if (!live) return;
        setData(Array.isArray(j.index) ? j.index : []);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const tokens = useMemo(() => tokenize(q), [q]);

  const results = useMemo(() => {
    const filtered = data.filter((it) => filters[it.type]);
    if (tokens.length === 0) {
      // default sort by date desc if present
      return [...filtered].sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
    }
    const scored = filtered
      .map((it) => ({ it, s: scoreItem(it, tokens) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.map(({ it }) => it);
  }, [data, tokens, filters]);

  const toggle = (t) => setFilters((f) => ({ ...f, [t]: !f[t] }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input w-full"
          placeholder="Search posts, recaps, polls…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {["blog","recap","holdem","poll"].map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`px-3 py-1.5 rounded border text-sm ${
                filters[t]
                  ? "border-white/30 text-white bg-white/10"
                  : "border-white/10 text-white/60 hover:text-white/80"
              }`}
              title={TYPE_LABEL[t]}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-white/60">Loading index…</div>
      ) : results.length === 0 ? (
        <div className="text-white/60">No results. Try a different term.</div>
      ) : (
        <ul className="grid gap-3">
          {results.map((r) => (
            <li key={`${r.type}:${r.slug}`} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-white/50">
                  <span className="inline-block rounded-full px-2 py-0.5 bg-white/10 border border-white/10">
                    {TYPE_LABEL[r.type]}
                  </span>
                  {r.date ? <span className="ml-2">{r.date}</span> : null}
                </div>
                <Link
                  href={r.url}
                  className="text-sm text-white/70 hover:text-white"
                >
                  Open →
                </Link>
              </div>
              <div className="mt-1 font-semibold">{r.title}</div>
              {r.excerpt ? (
                <div className="mt-1 text-sm text-white/70">{r.excerpt}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
