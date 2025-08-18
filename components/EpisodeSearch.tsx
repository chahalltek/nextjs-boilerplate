"use client";
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";

export default function EpisodeSearch({ tags = [] }: { tags?: string[] }) {
  const [data, setData] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [idx, setIdx] = useState<Fuse<any> | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/episodes")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setIdx(
          new Fuse(d, { keys: ["title", "guests", "tags"], threshold: 0.3 })
        );
      });
  }, []);

  const results = useMemo(() => {
    const base = q && idx ? idx.search(q).map((r) => r.item) : data;
    return activeTag ? base.filter((e: any) => e.tags?.includes(activeTag)) : base;
  }, [q, idx, data, activeTag]);

  return (
    <div className="w-full max-w-2xl">
      <input
        aria-label="Search episodes"
        placeholder="Search episodes, guests, tags…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-xl border p-3"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTag(activeTag === t ? null : t)}
            className={`rounded-full px-3 py-1 border ${
              activeTag === t ? "bg-black text-white" : ""
            }`}
            aria-pressed={activeTag === t}
          >
            {t}
          </button>
        ))}
      </div>
      {q || activeTag ? (
        <ul className="mt-4">
          {results.slice(0, 10).map((e: any) => (
            <li key={e.slug}>
              <button
                onClick={() => router.push(`/episodes/${e.slug}`)}
                className="w-full text-left py-2 underline"
              >
                {e.title}
              </button>
            </li>
          ))}
          {!results.length && (
            <li className="py-2 text-sm text-neutral-500">No matches.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}