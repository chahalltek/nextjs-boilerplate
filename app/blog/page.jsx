// app/blog/page.jsx
import Link from "next/link";
import matter from "gray-matter";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adds <link rel="alternate" type="application/rss+xml" href="/blog/rss">
export const metadata = {
  title: "Blog — Hey Skol Sister",
  description: "News, notes, and rants from Hey Skol Sister.",
  alternates: {
    types: {
      "application/rss+xml": "/blog/rss",
    },
  },
};

const DIR = "content/posts";
const b64 = (s) => Buffer.from(s || "", "base64").toString("utf8");

async function fetchPosts() {
  const items = await listDir(DIR).catch(() => []);
  const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));

  const posts = [];
  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;

    const raw = b64(file.contentBase64);
    const parsed = matter(raw);
    const fm = parsed.data || {};

    // Hide drafts from index
    if (fm.draft === true) continue;

    posts.push({
      slug: f.name.replace(/\.md$/, ""),
      title: fm.title || f.name,
      date: fm.date || "",
      excerpt: fm.excerpt || "",
    });
  }

  // newest first by date (fallback to slug alpha)
  posts.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return posts;
}

function RssBadge() {
  return (
    <Link
      href="/blog/rss"
      title="RSS feed"
      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white hover:bg-white/10"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="currentColor"
      >
        <path d="M6 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-4-7a1 1 0 0 1 1-1c6.075 0 11 4.925 11 11a1 1 0 1 1-2 0 9 9 0 0 0-9-9 1 1 0 0 1-1-1Zm0-5a1 1 0 0 1 1-1C13.956 5 21 12.044 21 21a1 1 0 1 1-2 0C19 13.82 12.18 7 4 7a1 1 0 0 1-1-1Z" />
      </svg>
      RSS
    </Link>
  );
}

export default async function BlogIndexPage() {
  const posts = await fetchPosts();

  return (
    <div className="container max-w-5xl py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Blog</h1>
        <RssBadge />
      </div>

      {posts.length === 0 ? (
        <div className="text-white/70">No posts yet. Check back soon!</div>
      ) : (
        <div className="grid gap-4">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${encodeURIComponent(p.slug)}`}
              className="card p-5 block hover:bg-white/5"
            >
              <div className="text-xs text-white/50">{p.date}</div>
              <div className="font-semibold">{p.title}</div>
              {p.excerpt && <div className="text-white/70 mt-1">{p.excerpt}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
