// app/blog/rss/route.js
import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = (process.env.SITE_URL || "https://www.theskolsisters.com").replace(/\/+$/,"");
const DIR = "content/posts";

// Utility
const b64toStr = (b64) => Buffer.from(b64 || "", "base64").toString("utf8");

export async function GET() {
  try {
    const items = await listDir(DIR).catch(() => []);
    const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));

    const posts = [];
    for (const f of files) {
      const file = await getFile(f.path).catch(() => null);
      if (!file?.contentBase64) continue;
      const raw = b64toStr(file.contentBase64);
      const parsed = matter(raw);
      const fm = parsed.data || {};
      // Skip drafts
      if (fm.draft === true) continue;

      const slug = f.name.replace(/\.md$/, "");
      posts.push({
        title: fm.title || slug,
        date: fm.date || "",
        excerpt: fm.excerpt || "",
        url: `${SITE_URL}/blog/${encodeURIComponent(slug)}`,
        content: parsed.content || "",
      });
    }

    // Sort by date desc (fallback title)
    posts.sort((a, b) => (b.date || b.title).localeCompare(a.date || a.title));

    const xmlItems = posts.map((p) => {
      const desc = (p.excerpt || p.content.replace(/\s+/g, " ").slice(0, 240)).trim();
      return `
  <item>
    <title><![CDATA[${p.title}]]></title>
    <link>${p.url}</link>
    <guid isPermaLink="true">${p.url}</guid>
    ${p.date ? `<pubDate>${new Date(p.date).toUTCString()}</pubDate>` : ""}
    <description><![CDATA[${desc}]]></description>
  </item>`.trim();
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Hey Skol Sister — Blog</title>
  <link>${SITE_URL}/blog</link>
  <description>New posts from Hey Skol Sister</description>
  ${xmlItems}
</channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
