// components/PlayerSearch.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Hit = { id: string; name: string; team?: string; position?: string; label: string };

export default function PlayerSearch({
  placeholder = "Add players",
  onSelect,
}: {
  placeholder?: string;
  onSelect: (hit: Hit) => void; // returns selected hit
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setHits(data.hits || []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded border border-white/10 bg-transparent px-3 py-2"
      />
      {open && (hits.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border border-white/10 bg-[#14111E] p-1 shadow-xl">
          {loading && <div className="px-3 py-2 text-sm text-white/60">Searching…</div>}
          {hits.map((h) => (
            <button
              key={h.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left hover:bg-white/10"
              onClick={() => {
                onSelect(h);
                setQ("");
                setOpen(false);
              }}
            >
              <span className="truncate">
                <span className="font-medium">{h.name}</span>
                <span className="text-white/60">
                  {h.team ? ` — ${h.team}` : ""} {h.position ?? ""}
                </span>
              </span>
              <code className="text-xs text-white/40">{h.id}</code>
            </button>
          ))}
          {!loading && hits.length === 0 && (
            <div className="px-3 py-2 text-sm text-white/60">No matches.</div>
          )}
        </div>
      )}
    </div>
  );
}
