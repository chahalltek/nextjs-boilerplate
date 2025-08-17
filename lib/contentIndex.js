// lib/contentIndex.js
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

function parseBase64Md(b64) {
  const raw = Buffer.from(b64, "base64").toString("utf8");
  const parsed = matter(raw);
  return { fm: parsed.data || {}, md: parsed.content || "" };
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Collect all docs from given spaces.
 * spaces: [{ key, dir, visible(fm): boolean }]
 */
export async function collectAll(spaces) {
  const out = [];
  for (const s of spaces) {
    const items = await listDir(s.dir);
    const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));
    for (const it of files) {
      const file = await getFile(it.path);
      if (!file?.contentBase64) continue;
      const { fm, md } = parseBase64Md(file.contentBase64);
      if (s.visible && !s.visible(fm)) continue;
      out.push({
        kind: s.key,
        slug: it.name.replace(/\.md$/, ""),
        path: it.path,
        title: fm.title || it.name,
        date: fm.date || "",
        excerpt: fm.excerpt || "",
        tags: normalizeTags(fm.tags),
        fm,
        content: md,
      });
    }
  }
  // newest first by date fallback slug
  out.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return out;
}

export function tagCounts(docs) {
  const map = new Map();
  for (const d of docs) {
    for (const t of d.tags) {
      const key = t.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function filterByTag(docs, tag) {
  const tgt = tag.toLowerCase();
  return docs.filter((d) => d.tags.map((t) => t.toLowerCase()).includes(tgt));
}
