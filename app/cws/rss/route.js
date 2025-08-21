// app/cws/rss/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import matter from "gray-matter";
import { listDir, getFile } from "@/lib/github";

const SITE = (process.env.SITE_URL || "https://www.heyskolsister.com").replace(/\/+$/,"");
const DIR = "content/recaps";
const b64 = (s) => Buffer.from(s || "", "base64").toString("utf8");

function toTime(dateStr = "") {
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getTime();
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return 0;
}
function rfc822(dateStr = "") {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}
const esc = (s) =>
  String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// Tiny markdown→HTML (paragraphs + line breaks); enough for feeds without deps
function mdToHtml(md = "") {
  const blocks = md.trim().split(/\n\s*\n/);
  return blocks.map(b => `<p>${esc(b).replace(/\n/g,"<br/>")}</p>`).join("\n");
}

async function fetchRecaps() {
  const items = await listDir(DIR).catch(() => []);
  const files = items.filter(it => it.type === "file" && /\.mdx?$/i.test(it.name));

  const recaps = [];
  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;

    const raw = b64(file.contentBase64);
    const parsed = matter(raw);
    const fm = parsed.data || {};
    if (fm.published === false) continue; // show unless explicitly hidden

    recaps.push({
      slug: f.name.replace(/\.(md|mdx)$/i, ""),
      title: fm.title || f.name.replace(/\.(md|mdx)$/i, ""),
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      html: mdToHtml(parsed.content || ""),
    });
  }

  // newest first by real time
  recaps.sort((a, b) => toTime(b.date) - toTime(a.date));
  return recaps;
}

export async function GET() {
  const recaps = await fetchRecaps();

  const itemsXml = recaps.map(r => {
    const url = `${SITE}/cws/${encodeURIComponent(r.slug)}`;
    const desc = r.excerpt || r.title;
    return `
<item>
  <title><![CDATA[ ${r.title} ]]></title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  ${r.date ? `<pubDate>${rfc822(r.date)}</pubDate>` : ""}
  <description><![CDATA[ ${desc} ]]></description>
  <content:encoded><![CDATA[ ${r.html} ]]></content:encoded>
</item>`.trim();
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Hey Skol Sister — Weekly Recap</title>
    <link>${SITE}/cws</link>
    <atom:link href="${SITE}/cws/rss" rel="self" type="application/rss+xml" />
    <description>Published weekly recaps</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
