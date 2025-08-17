// app/tags/[tag]/page.jsx
import Link from "next/link";
import { collectAll, filterByTag } from "@/lib/contentIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const tag = decodeURIComponent(params.tag || "");
  return {
    title: `#${tag} — Hey Skol Sister`,
    description: `Posts tagged with ${tag}.`,
  };
}

export default async function TagPage({ params }) {
  const tag = decodeURIComponent(params.tag || "");
  const docs = await collectAll([
    { key: "blog", dir: "content/posts", visible: (fm) => fm.draft !== true },
    { key: "recap", dir: "content/recaps", visible: (fm) => fm.published === true },
    { key: "holdem", dir: "content/holdem", visible: (fm) => fm.published === true },
  ]);
  const items = filterByTag(docs, tag);

  const groups = {
    blog: items.filter((d) => d.kind === "blog"),
    recap: items.filter((d) => d.kind === "recap"),
    holdem: items.filter((d) => d.kind === "holdem"),
  };

  const none = items.length === 0;

  return (
    <div className="container max-w-5xl py-10 space-y-8">
      <h1 className="text-2xl font-bold">#{tag}</h1>
      {none && <div className="text-white/70">Nothing here (yet).</div>}

      {groups.blog.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Blog</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {groups.blog.map((p) => (
              <Link key={p.slug} href={`/blog/${encodeURIComponent(p.slug)}`} className="card p-4 block hover:bg-white/5">
                <div className="text-xs text-white/50">{p.date}</div>
                <div className="font-medium">{p.title}</div>
                {p.excerpt && <div className="text-sm text-white/70 mt-1">{p.excerpt}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {groups.recap.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Weekly Recap</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {groups.recap.map((r) => (
              <Link key={r.slug} href={`/cws/${encodeURIComponent(r.slug)}`} className="card p-4 block hover:bg-white/5">
                <div className="text-xs text-white/50">{r.date}</div>
                <div className="font-medium">{r.title}</div>
                {r.excerpt && <div className="text-sm text-white/70 mt-1">{r.excerpt}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {groups.holdem.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Hold ’em / Fold ’em</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {groups.holdem.map((h) => (
              <Link key={h.slug} href={`/holdem-foldem/${encodeURIComponent(h.slug)}`} className="card p-4 block hover:bg-white/5">
                <div className="text-xs text-white/50">{h.date}</div>
                <div className="font-medium">{h.title}</div>
                {h.excerpt && <div className="text-sm text-white/70 mt-1">{h.excerpt}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
