// app/holdem-foldem/page.jsx
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/holdem";

function normTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

async function fetchPublished() {
  const items = await listDir(DIR);
  const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));
  const out = [];

  for (const f of files) {
    const file = await getFile(f.path);
    if (!file?.contentBase64) continue;
    const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
    const parsed = matter(raw);
    const fm = parsed.data || {};
    if (!fm.published) continue;

    out.push({
      slug: f.name.replace(/\.md$/, ""),
      title: fm.title || f.name,
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      tags: normTags(fm.tags),
    });
  }
  out.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return out;
}

export default async function HoldemIndexPage() {
  const posts = await fetchPublished();

  return (
    <div className="container max-w-5xl py-10 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Hold ’em / Fold ’em</h1>
        <Link href="/tags" className="text-white/70 hover:text-white">Browse tags →</Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-white/70">Nothing yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {posts.map((p) => (
            <Link key={p.slug} href={`/holdem-foldem/${encodeURIComponent(p.slug)}`} className="card p-4 block hover:bg-white/5">
              <div className="text-xs text-white/50">{p.date}</div>
              <div className="font-medium">{p.title}</div>
              {p.excerpt && <div className="text-sm text-white/70 mt-1">{p.excerpt}</div>}
              {p.tags.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <li key={t}>
                      <span className="text-[11px] rounded-full border border-white/15 px-2 py-0.5 text-white/70">
                        <Link href={`/tags/${encodeURIComponent(t)}`}>#{t}</Link>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
