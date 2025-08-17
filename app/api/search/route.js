// app/api/search/route.js
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where your markdown lives in the repo
const ROOT = process.cwd();
const SOURCES = [
  { dir: "content/posts", type: "post", baseUrl: "/blog" },
  { dir: "content/recaps", type: "recap", baseUrl: "/cws" },
  { dir: "content/holdem", type: "holdem", baseUrl: "/holdem-foldem" },
];

function safeList(dirAbs) {
  try {
    return fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return [];
  }
}

function readMarkdown(absPath) {
  try {
    const raw = fs.readFileSync(absPath, "utf8");
    const parsed = matter(raw);
    return {
      frontmatter: parsed.data || {},
      content: parsed.content || "",
    };
  } catch {
    return null;
  }
}

function makeSnippet(haystack, needle, span = 80) {
  const i = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return "";
  const start = Math.max(0, i - Math.floor(span / 2));
  return haystack.slice(start, start + span).replace(/\s+/g, " ");
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ ok: true, items: [], counts: {} });
  }

  const items = [];
  const counts = { post: 0, recap: 0, holdem: 0 };

  for (const src of SOURCES) {
    const dirAbs = path.join(ROOT, src.dir);
    const entries = safeList(dirAbs);

    for (const ent of entries) {
      if (!ent.isFile() || !ent.name.endsWith(".md")) continue;
      const slug = ent.name.replace(/\.md$/, "");
      const abs = path.join(dirAbs, ent.name);
      const md = readMarkdown(abs);
      if (!md) continue;

      const fm = md.frontmatter;
      const title = String(fm.title || slug);
      const date = String(fm.date || "");
      const excerpt = String(fm.excerpt || "");
      const content = String(md.content || "");

      // simple search across title, excerpt, content
      const hayTitle = title.toLowerCase();
      const hayExcerpt = excerpt.toLowerCase();
      const hayContent = content.toLowerCase();
      const needle = q.toLowerCase();

      let matched = false;
      let where = "";
      let snippet = "";

      if (hayTitle.includes(needle)) {
        matched = true;
        where = "title";
        snippet = title;
      } else if (hayExcerpt.includes(needle)) {
        matched = true;
        where = "excerpt";
        snippet = excerpt;
      } else if (hayContent.includes(needle)) {
        matched = true;
        where = "content";
        snippet = makeSnippet(content, q, 120);
      }

      if (matched) {
        items.push({
          type: src.type,
          title,
          date,
          excerpt,
          slug,
          url: `${src.baseUrl}/${encodeURIComponent(slug)}`,
          match: { in: where, snippet },
        });
        counts[src.type] += 1;
      }
    }
  }

  // Sort by date desc (fallback alphabetic)
  items.sort((a, b) => (b.date || b.title).localeCompare(a.date || a.title));

  return NextResponse.json({ ok: true, items, counts });
}
