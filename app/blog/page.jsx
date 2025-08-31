// app/blog/page.jsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;                // never ISR this page
export const fetchCache = "force-no-store"; // default all fetches to no-store

import Link from "next/link";
import Image from "next/image"; // ← added
import matter from "gray-matter";
import { listDir, getFile } from "@/lib/github";
import SubscribeCta from "@/components/SubscribeCta";

const DIR = "content/posts";
const b64 = (s) => Buffer.from(s || "", "base64").toString("utf8");

function toTime(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.getTime();
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return 0;
}

async function fetchPosts() {
  const items = await listDir(DIR).catch(() => []);
  const files = items.filter((it) => it.type === "file" && /\.mdx?$/i.test(it.name));

  const posts = [];
  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;

    const raw = b64(file.contentBase64);
    const parsed = matter(raw);
    const fm = parsed.data || {};

    const draftStr = String(fm.draft ?? "").toLowerCase().trim();
    const activeStr = String(fm.active ?? "true").toLowerCase().trim();

    const draft =
      fm.draft === true ||
      draftStr === "true" || draftStr === "1" || draftStr === "yes";

    const active =
      fm.active === true ||
      (activeStr !== "false" && activeStr !== "0" && activeStr !== "no");

    if (draft || !active) continue;

    const publishAt = fm.publishAt ? new Date(fm.publishAt) : null;
    if (publishAt && Date.now() < publishAt.getTime()) continue;

    posts.push({
      slug: f.name.replace(/\.(md|mdx)$/i, ""),
      title: fm.title || f.name.replace(/\.(md|mdx)$/i, ""),
      date: fm.date || "",
      excerpt: fm.excerpt || "",
    });
  }

  posts.sort((a, b) => toTime(b.date) - toTime(a.date));
  return posts;
}

export default async function BlogIndexPage() {
  const posts = await fetchPosts();

  return (
    <div className="container max-w-5xl py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Blog</h1>
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
      </div>

     {/* Fans / Community image — smaller footprint */}
<div className="relative w-full rounded-xl overflow-hidden
                aspect-[4/3] md:aspect-[3/2] max-h-[220px] md:max-h-[200px]">
  <Image
    src="/images/home/fans-bar.jpg"
    alt="Friends cheering a football play at a bar."
    fill
    /* smaller rasters on wider screens */
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 33vw"
    className="object-cover object-center"
    priority={false}
  />
</div>

      <SubscribeCta variant="starter-pack" />

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

      <SubscribeCta variant="starter-pack" />
    </div>
  );
}
