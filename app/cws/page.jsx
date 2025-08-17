// app/cws/page.jsx
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/recaps";

function normTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

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
      tags: normTags(fm.tags),
      content: parsed.content || "",
    });
  }
  recaps.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return recaps;
}

function CwsExplainer() {
  return (
    <section className="card p-6 mb-8">
      <h2 className="text-xl font-bold mb-3">What is “Weekly Recap” (aka CWS)?</h2>
      <p className="text-white/80">
        CWS stands for <em>Coulda, Woulda, Shoulda</em> — the spiritual cousin of Survivor confessionals
        and the official diary of fantasy football regret.
      </p>

      <div className="mt-5 space-y-6 text-white/80">
        <div>
          <p className="font-semibold">How to play along</p>
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li><strong>Step 1:</strong> Set your lineup with confidence. (What could go wrong?)</li>
            <li><strong>Step 2:</strong> Watch your bench casually drop 38. (We’ve all been there.)</li>
            <li><strong>Step 3:</strong> Post your recap and the one tiny decision that changed everything.</li>
            <li><strong>Step 4:</strong> React to others with empathy, stats, memes, and kicker therapy.</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold">House rules</p>
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li>Be kind. We’re here to laugh, learn, and commiserate — not blindside each other.</li>
            <li>Screenshots welcome. Bonus points for dramatic “before/after” energy.</li>
            <li>Ties are broken by the best GIF, the spiciest stat, or the most creative “shoulda.”</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default async function CwsIndexPage() {
  const recaps = await fetchPublishedRecaps();
  const [latest, ...older] = recaps;

  return (
    <div className="container max-w-5xl py-10 space-y-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Weekly Recap</h1>
        <Link href="/cws/archive" className="text-white/70 hover:text-white">View archive →</Link>
      </div>

      {!latest ? (
        <>
          <div className="text-white/70">No recaps yet. Check back soon!</div>
          <CwsExplainer />
        </>
      ) : (
        <>
          <article className="card p-5 space-y-3">
            <div className="text-sm text-white/60">{latest.date}</div>
            <h2 className="text-xl font-semibold">{latest.title}</h2>
            {latest.excerpt && <p className="text-white/80">{latest.excerpt}</p>}

            {latest.tags?.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {latest.tags.map((t) => (
                  <li key={t}>
                    <Link href={`/tags/${encodeURIComponent(t)}`} className="text-xs rounded-full border border-white/20 px-2 py-0.5 text-white/70 hover:text-white">#{t}</Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{latest.content}</ReactMarkdown>
            </div>
            <div>
              <Link
                href={`/cws/${encodeURIComponent(latest.slug)}`}
                className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
              >
                Open comments & reactions →
              </Link>
            </div>
          </article>

          <CwsExplainer />

          {older.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Previous Weeks</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {older.map((r) => (
                  <Link key={r.slug} href={`/cws/${encodeURIComponent(r.slug)}`} className="card p-4 block hover:bg-white/5">
                    <div className="text-xs text-white/50">{r.date}</div>
                    <div className="font-medium">{r.title}</div>
                    {r.excerpt && <div className="text-sm text-white/70 mt-1">{r.excerpt}</div>}
                    {r.tags?.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {r.tags.map((t) => (
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
