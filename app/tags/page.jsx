// app/tags/page.jsx
import Link from "next/link";
import { collectAll, tagCounts } from "@/lib/contentIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tags — Hey Skol Sister",
  description: "Browse topics across the site.",
};

export default async function TagsIndexPage() {
  const docs = await collectAll([
    { key: "blog", dir: "content/posts", visible: (fm) => fm.draft !== true },
    { key: "recap", dir: "content/recaps", visible: (fm) => fm.published === true },
    { key: "holdem", dir: "content/holdem", visible: (fm) => fm.published === true },
  ]);
  const tags = tagCounts(docs);

  return (
    <div className="container max-w-5xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Browse by tag</h1>
      {tags.length === 0 ? (
        <div className="text-white/70">No tags yet.</div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
                title={`${count} item${count === 1 ? "" : "s"}`}
              >
                <span className="font-medium">#{tag}</span>
                <span className="text-white/60">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
