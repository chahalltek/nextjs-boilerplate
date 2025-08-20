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

// Parse YYYY-M-D (or YYYY-MM-DD) into a UTC timestamp.
// Falls back to Date.parse for other formats. Returns NaN if unparseable.
function toUtcTs(dateStr) {
  if (!dateStr) return NaN;
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getTime();
  }
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? NaN : t;
}

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

    const dateStr = fm.date || fm.publishAt || "";
    const ts = toUtcTs(dateStr);

    posts.push({
      slug: f.name.replace(/\.md$/, ""),
      title: fm.title || f.name,
      date: dateStr,
      excerpt: fm.excerpt || "",
      _ts: Number.isNaN(ts) ? -1 : ts,
    });
  }

  // Newest first by timestamp; fallback to slug alpha if no/invalid date
  posts.sort((a, b) => (b._ts - a._ts) || b.slug.localeCompare(a.slug));
  return posts;
}

function RssBadge() {
  return (
    <Link
      href="/blog/rss"
      title="RSS feed"
      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white hover:bg-white/10"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
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
