"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/search-index", { cache: "no-store" });
      const j = await r.json();
      if (j?.ok) setRows(j.rows || []);
    })();
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows.slice(0, 24);
    const words = s.split(/\s+/).filter(Boolean);
    const score = (row) => {
      const hay = [row.title, row.excerpt, ...(row.tags || []), row.type].join(" ").toLowerCase();
      let sc = 0;
      for (const w of words) sc += (hay.match(new RegExp(w, "g")) || []).length;
      if (row.date) sc += 0.2; // tiny boost for dated items
      return sc;
    };
    return rows
      .map((r) => ({ r, s: score(r) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50)
      .map((x) => x.r);
  }, [q, rows]);

  return (
    <div className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts, recaps, Hold ’em / Fold ’em, tags…"
        className="input w-full"
      />
      {!results.length ? (
        <div className="text-white/70">No results yet.</div>
      ) : (
        <div className="grid gap-3">
          {results.map((r) => (
            <Link key={`${r.type}:${r.slug}`} href={r.url} className="card p-4 hover:bg-white/5">
              <div className="text-xs text-white/50">{r.type}{r.date && ` • ${r.date}`}</div>
              <div className="font-semibold">{r.title}</div>
              <div className="text-sm text-white/70 line-clamp-2 mt-1">{r.excerpt}</div>
              {!!r.tags?.length && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full border border-white/15 text-xs text-white/70">#{t}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
