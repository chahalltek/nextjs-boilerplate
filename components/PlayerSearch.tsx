"use client";
import { useEffect, useState } from "react";

export default function PlayerSearch({ onPick }: { onPick: (p: {id:string; name:string}) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setRows(json.results || []);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder="Search players…"
        className="w-full bg-transparent border border-white/20 rounded px-3 py-2"
      />
      {!!rows.length && (
        <div className="absolute z-20 mt-1 w-full rounded border border-white/10 bg-[#120F1E]">
          {rows.map((r:any) => (
            <button
              key={r.id}
              onClick={() => { onPick({id:r.id, name:r.full_name}); setQ(""); setRows([]); }}
              className="w-full text-left px-3 py-2 hover:bg-white/10"
            >
              {r.full_name} <span className="text-white/50 text-xs">({r.position || "—"} {r.team || ""})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
