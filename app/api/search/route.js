// app/api/search/route.js
import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where we store things in the repo:
const POSTS_DIR = "content/posts";
const RECAPS_DIR = "content/recaps";

function fromB64(b64) {
  return Buffer.from(b64, "base64").toString("utf8");
}

async function readCollection(dir, type) {
  const out = [];
  try {
    const items = await listDir(dir);
    const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));
    for (const f of files) {
      const file = await getFile(f.path);
      if (!file?.contentBase64) continue;
      const raw = fromB64(file.contentBase64);
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const slug = f.name.replace(/\.md$/, "");

      // visibility rules
      if (type === "recap" && fm.published === false) continue;
      if (type === "post" && fm.draft === true) continue;

      out.push({
        type: type === "post" ? "post" : "recap",
        slug,
        title: fm.title || slug,
        date: fm.date || "",
        excerpt: fm.excerpt || "",
        content: parsed.content || "",
        url: type === "post" ? `/blog/${slug}` : `/cws/${slug}`,
      });
    }
  } catch {
    // swallow; if the directory doesn't exist yet, just return empty
  }
  return out;
}

function matches(q, r) {
  const needle = q.toLowerCase();
  return (
    (r.title && r.title.toLowerCase().includes(needle)) ||
    (r.excerpt && r.excerpt.toLowerCase().includes(needle)) ||
    (r.content && r.content.toLowerCase().includes(needle))
  );
}

export async function GET(request) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [] });
  }

  try {
    const [posts, recaps] = await Promise.all([
      readCollection(POSTS_DIR, "post"),
      readCollection(RECAPS_DIR, "recap"),
    ]);

    const all = [...posts, ...recaps].filter((r) => matches(q, r));

    // Lighten payload
    const results = all.map(({ type, slug, title, date, excerpt, url, content }) => ({
      type,
      slug,
      title,
      date,
      excerpt:
        excerpt ||
        (content ? content.replace(/\s+/g, " ").slice(0, 160) : ""),
      url,
    }));

    // Sort by date desc (fallback title/slug)
    results.sort((a, b) => (b.date || b.title || b.slug).localeCompare(a.date || a.title || a.slug));

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
