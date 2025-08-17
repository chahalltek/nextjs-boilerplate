export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";

const SECTIONS = [
  { dir: "content/posts", base: "/blog", kind: "post" },
  { dir: "content/recaps", base: "/cws", kind: "recap" },
  { dir: "content/holdem-foldem", base: "/holdem-foldem", kind: "holdem" }, // keep if you tag these too
];

async function loadAll() {
  const rows = [];
  for (const sec of SECTIONS) {
    const items = await listDir(sec.dir);
    for (const it of items.filter((x) => x.type === "file" && x.name.endsWith(".md"))) {
      const blob = await getFile(it.path);
      const raw = blob?.contentBase64 ? Buffer.from(blob.contentBase64, "base64").toString("utf8") : "";
      const { data } = matter(raw);
      if (data?.published === false) continue;

      rows.push({
        url: `${sec.base}/${encodeURIComponent(it.name.replace(/\.md$/, ""))}`,
        title: data?.title || it.name,
        date: data?.date || "",
        excerpt: data?.excerpt || "",
        tags: Array.isArray(data?.tags) ? data.tags : [],
        kind: sec.kind,
        slug: it.name.replace(/\.md$/, "")
      });
    }
  }
  rows.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return rows;
}

export default async function TagPage({ params }) {
  const tag = decodeURIComponent(params.tag);
  const all = await loadAll();
  const hits = all.filter((p) => p.tags.map((t) => String(t).toLowerCase()).includes(tag.toLowerCase()));

  return (
    <div className="container max-w-5xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Tag: {tag}</h1>
      {!hits.length ? (
        <div className="text-white/70">No content yet for this tag.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {hits.map((p) => (
            <Link key={p.url} href={p.url} className="card p-4 block hover:bg-white/5">
              <div className="text-xs text-white/50">{p.kind}{p.date && ` • ${p.date}`}</div>
              <div className="font-semibold mt-0.5">{p.title}</div>
              {p.excerpt && <div className="text-sm text-white/70 mt-1">{p.excerpt}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
