// app/sitemap.xml/route.js
import { NextResponse } from "next/server";
import { getPosts, getRecaps, getHoldem } from "@/lib/contentIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL || "https://www.heyskolsister.com";

function urlTag(loc, lastmod) {
  return `
  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
}

export async function GET() {
  const staticPaths = [
    "/", "/blog", "/cws", "/holdem-foldem", "/survivor", "/about", "/subscribe", "/search",
  ];

  const [posts, recaps, holdem] = await Promise.all([
    getPosts(), getRecaps(), getHoldem()
  ]);

  const urls = [
    ...staticPaths.map((p) => urlTag(`${SITE_URL}${p}`)),
    ...posts.map((p) => urlTag(`${SITE_URL}${p.url}`, p.date)),
    ...recaps.map((r) => urlTag(`${SITE_URL}${r.url}`, r.date)),
    ...holdem.map((h) => urlTag(`${SITE_URL}${h.url}`, h.date)),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
