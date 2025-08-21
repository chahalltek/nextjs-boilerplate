// app/blog/rss/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import matter from "gray-matter";
import { listDir, getFile } from "@/lib/github";

const SITE = "https://www.heyskolsister.com";
const DIR = "content/posts";
const b64 = (s: string) => Buffer.from(s || "", "base64").toString("utf8");

function rfc822(dateStr = "") {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

function toTime(dateStr = "") {
  const d = new Date(dateStr);
  if (!isNaN(d as any)) return d.getTime();
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return 0;
}

async function fetchPosts() {
  const items = await listDir(DIR).catch(() => []);
  const files = items.filter((it: any) => it.type === "file" && /\.mdx?$/i.test(it.name));

  const posts: Array<{
    slug: string;
    title: string;
    date: string;
    excerpt: string;
    html: string; // full content as HTML
  }> = [];

  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;

    const raw = b64(file.contentBase64);
    const parsed = matter(raw);
    const fm = parsed.data || {};
    if (fm.draft === true) continue;

    // Try to render Markdown to HTML (prefers 'marked' if installed)
    let html = "";
    try {
      const { marked } = await import("marked"); // npm i marked
      html = marked.parse(parsed.content || "");
    } catch {
      // Fallback: wrap raw markdown for readers that can handle it
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html = `<pre>${esc(parsed.content || "")}</pre>`;
    }

    posts.push({
      slug: f.name.replace(/\.(md|mdx)$/i, ""),
      title: fm.title || f.name.replace(/\.(md|mdx)$/i, ""),
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      html,
    });
  }

  posts.sort((a, b) => toTime(b.date) - toTime(a.date));
  return posts;
}

export async function GET() {
  const posts = await fetchPosts();

  const itemsXml = posts
    .map((p) => {
      const url = `${SITE}/blog/${encodeURIComponent(p.slug)}`;
      const desc = p.excerpt || p.title;
      return `
<item>
  <title><![CDATA[ ${p.title} ]]></title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${rfc822(p.date)}</pubDate>
  <description><![CDATA[ ${desc} ]]></description>
  <content:encoded><![CDATA[ ${p.html} ]]></content:encoded>
</item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Hey Skol Sister — Blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/blog/rss" rel="self" type="application/rss+xml" />
    <description>New posts from Hey Skol Sister</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
