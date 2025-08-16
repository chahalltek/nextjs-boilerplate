import React from "react";
import Link from "next/link";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECAPS_DIR = "content/recaps";

function safeDateValue(d) {
  // Prefer YYYY-MM-DD; if missing/invalid, return empty so sort falls back.
  if (!d) return "";
  // basic guard to avoid "Invalid Date" issues
  return /^\d{4}-\d{2}-\d{2}/.test(d) ? d : "";
}

async function fetchAllRecapsDetailed() {
  const entries = await listDir(RECAPS_DIR).catch(() => []);
  const files = (entries || []).filter(e => e.type === "file" && e.name.endsWith(".md"));

  const items = [];
  for (const f of files) {
    try {
      const got = await getFile(f.path);
      if (!got?.contentBase64) continue;
      const text = Buffer.from(got.contentBase64, "base64").toString("utf8");
      const { data, content } = matter(text);
      const slug = f.name.replace(/\.md$/, "");
      items.push({
        slug,
        title: data.title || slug,
        date: safeDateValue(data.date),
        excerpt: data.excerpt || "",
        content: content || "",
      });
    } catch {
      // ignore an individual bad file and continue
    }
  }

  // Newest first by date; if equal/missing, fall back to slug desc (recently named usually last)
  items.sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) || b.slug.localeCompare(a.slug)
  );

  return items;
}

export default async function CwsIndexPage() {
  const recaps = await fetchAllRecapsDetailed();

  if (!recaps.length) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Weekly Recap</h1>
        <p className="text-white/70 mb-6">
          Our Coulda/Woulda/Shoulda corner: weekly reflections and what we’d tweak next time.
        </p>
        <div className="text-white/60">No recaps yet. Check back soon!</div>
      </div>
    );
  }

  const [featured, ...older] = recaps;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Weekly Recap</h1>
        <p className="text-white/70 mt-2">
          Your weekly Coulda/Woulda/Shoulda. The latest recap is featured below; past weeks are listed after.
        </p>
      </header>

      {/* Featured (latest) recap rendered in full */}
      <section className="card p-6 space-y-4">
        <div className="text-xs uppercase tracking-wide text-white/60">This Week’s Recap</div>
        <h2 className="text-2xl font-semibold">{featured.title}</h2>
        {featured.date && <div className="text-white/60 text-sm">{featured.date}</div>}

        <article className="prose prose-invert max-w-none">
          <ReactMarkdown>{featured.content}</ReactMarkdown>
        </article>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href={`/cws/${encodeURIComponent(featured.slug)}`}
            className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10"
          >
            Open comments & reactions
          </Link>
          {featured.excerpt && (
            <div className="text-white/60 text-sm line-clamp-1">Summary: {featured.excerpt}</div>
          )}
        </div>
      </section>

      {/* Older recaps as tiles */}
      <section>
        <h3 className="text-xl font-semibold mb-3">Previous Weeks</h3>
        {older.length === 0 ? (
          <div className="text-white/60">No earlier recaps yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {older.map((r) => (
              <Link
                key={r.slug}
                href={`/cws/${encodeURIComponent(r.slug)}`}
                className="card p-5 hover:bg-white/5 transition-colors"
              >
                <div className="text-sm text-white/50">{r.date || "Undated"}</div>
                <div className="text-lg font-semibold mt-1 line-clamp-2">{r.title}</div>
                {r.excerpt && <div className="text-white/70 text-sm mt-2 line-clamp-3">{r.excerpt}</div>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
