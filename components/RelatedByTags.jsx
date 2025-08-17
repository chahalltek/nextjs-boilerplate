// Server component – finds content with overlapping tags
export const runtime = "nodejs";

import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";

export default async function RelatedByTags({ dir, base, currentSlug, currentTags = [] }) {
  const items = await listDir(dir);
  const pool = [];
  const want = (currentTags || []).map((t) => String(t).toLowerCase());

  for (const it of items.filter((x) => x.type === "file" && x.name.endsWith(".md"))) {
    const slug = it.name.replace(/\.md$/, "");
    if (slug === currentSlug) continue;

    const f = await getFile(it.path);
    const raw = f?.contentBase64 ? Buffer.from(f.contentBase64, "base64").toString("utf8") : "";
    const { data } = matter(raw);
    if (data?.published === false) continue;

    const tags = Array.isArray(data?.tags) ? data.tags : [];
    const overlap = tags.filter((t) => want.includes(String(t).toLowerCase())).length;
    if (!overlap) continue;

    pool.push({
      slug,
      title: data?.title || it.name,
      date: data?.date || "",
      excerpt: data?.excerpt || "",
      score: overlap,
    });
  }

  pool.sort((a, b) => b.score - a.score || (b.date || b.slug).localeCompare(a.date || a.slug));
  const top = pool.slice(0, 4);
  if (!top.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-3">Related</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {top.map((p) => (
          <Link key={p.slug} href={`${base}/${encodeURIComponent(p.slug)}`} className="card p-4 block hover:bg-white/5">
            <div className="text-xs text-white/50">{p.date}</div>
            <div className="font-medium">{p.title}</div>
            {p.excerpt && <div className="text-sm text-white/70 mt-1">{p.excerpt}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
