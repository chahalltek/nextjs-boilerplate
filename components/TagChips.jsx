"use client";
import Link from "next/link";

export default function TagChips({ tags = [] }) {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (!list.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {list.map((t) => (
        <Link
          key={t}
          href={`/tag/${encodeURIComponent(t)}`}
          className="px-2 py-0.5 rounded-full border border-white/20 text-xs text-white/80 hover:bg-white/10"
        >
          #{t}
        </Link>
      ))}
    </div>
  );
}
