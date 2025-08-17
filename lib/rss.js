// lib/rss.js
const SITE_URL = process.env.SITE_URL || "https://www.theskolsisters.com";

function escape(str = "") {
  return str.replace(/[<>&'"]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;" }[c]));
}

export function buildRss({ title, items, feedPath = "/rss.xml" }) {
  const now = new Date().toUTCString();
  const xmlItems = items.map((it) => {
    const link = it.absoluteUrl || `${SITE_URL}${it.url}`;
    const pub = it.date ? new Date(it.date).toUTCString() : now;
    return `
      <item>
        <title>${escape(it.title)}</title>
        <link>${escape(link)}</link>
        <guid>${escape(link)}</guid>
        <pubDate>${pub}</pubDate>
        ${it.excerpt ? `<description>${escape(it.excerpt)}</description>` : ""}
      </item>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escape(title)}</title>
  <link>${SITE_URL}</link>
  <description>${escape(title)}</description>
  <lastBuildDate>${now}</lastBuildDate>
  <ttl>180</ttl>
  ${xmlItems}
</channel>
</rss>`;
}
