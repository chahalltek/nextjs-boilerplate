// app/cws/page.jsx
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/recaps";

async function fetchPublishedRecaps() {
  const items = await listDir(DIR);
  const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));

  const recaps = [];
  for (const f of files) {
    const file = await getFile(f.path);
    if (!file?.contentBase64) continue;
    const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
    const parsed = matter(raw);
    const fm = parsed.data || {};
    if (!fm.published) continue;

    recaps.push({
      slug: f.name.replace(/\.md$/, ""),
      title: fm.title || f.name,
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      content: parsed.content || "",
    });
  }

  // newest first
  recaps.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return recaps;
}

export default async function CwsIndexPage() {
  const recaps = await fetchPublishedRecaps();
  const [latest, ...older] = recaps;

  return (
    <div className="container max-w-5xl py-10 space-y-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Weekly Recap</h1>
        <Link href="/cws/archive" className="text-white/70 hover:text-white">
          View archive →
        </Link>
      </div>

      {!latest ? (
        <div className="text-white/70">No recaps yet.</div>
      ) : (
        <>
          {/* Latest full */}
          <article className="card p-5 space-y-3">
            <div className="text-sm text-white/60">{latest.date}</div>
            <h2 className="text-xl font-semibold">{latest.title}</h2>
            {latest.excerpt && <p className="text-white/80">{latest.excerpt}</p>}
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{latest.content}</ReactMarkdown>
            </div>
            <div>
              <Link
                href={`/cws/${latest.slug}`}
                className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
              >
                Discuss & comments →
              </Link>
            </div>
          </article>

          {/* Older tiles */}
          {older.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Previous Weeks</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {older.map((r) => (
                  <Link key={r.slug} href={`/cws/${r.slug}`} className="card p-4 block hover:bg-white/5">
                    <div className="text-xs text-white/50">{r.date}</div>
                    <div className="font-medium">{r.title}</div>
                    {r.excerpt && <div className="text-sm text-white/70 mt-1">{r.excerpt}</div>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
