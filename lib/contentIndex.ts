// lib/contentIndex.ts
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

type FrontMatter = {
  title?: string;
  date?: string;          // ISO string recommended
  excerpt?: string;
  tags?: string[] | string;
  draft?: boolean;
  [key: string]: any;
};

type Doc = {
  kind: string;           // e.g., "post" | "recap" | "holdem"
  slug: string;
  path: string;
  title: string;
  date: string;           // may be ""
  excerpt: string;
  tags: string[];
  fm: FrontMatter;
  content: string;
};

// --- utils -------------------------------------------------------------

function parseBase64Md(b64: string) {
  const raw = Buffer.from(b64, "base64").toString("utf8");
  const parsed = matter(raw);
  return { fm: (parsed.data || {}) as FrontMatter, md: parsed.content || "" };
}

function normalizeTags(tags?: FrontMatter["tags"]) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map(String).map((t) => t.trim()).filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

// --- core collector ----------------------------------------------------

/**
 * Collect all docs from given spaces.
 * spaces: [{ key, dir, visible?(fm): boolean }]
 * - tolerant of missing folders
 * - supports .md and .mdx
 */
export async function collectAll(
  spaces: { key: string; dir: string; visible?: (fm: FrontMatter) => boolean }[]
): Promise<Doc[]> {
  const out: Doc[] = [];

  for (const s of spaces) {
    // tolerate missing directories
    let items: any[] = [];
    try {
      items = (await listDir(s.dir)) || [];
    } catch {
      items = [];
    }
    const files = items.filter(
      (it) => it?.type === "file" && /\.(md|mdx)$/i.test(it?.name || "")
    );

    for (const it of files) {
      const file = await getFile(it.path).catch(() => null);
      if (!file?.contentBase64) continue;

      const { fm, md } = parseBase64Md(file.contentBase64);
      if (s.visible && !s.visible(fm)) continue;

      const slug = String(it.name).replace(/\.(md|mdx)$/i, "");
      out.push({
        kind: s.key,
        slug,
        path: it.path,
        title: fm.title || slug,
        date: fm.date || "",
        excerpt: fm.excerpt || "",
        tags: normalizeTags(fm.tags),
        fm,
        content: md,
      });
    }
  }

  // newest first by date (fallback: slug)
  out.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return out;
}

// --- helpers -----------------------------------------------------------

export function tagCounts(docs: Doc[]) {
  const map = new Map<string, number>();
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

export function filterByTag(docs: Doc[], tag: string) {
  const tgt = tag.toLowerCase();
  return docs.filter((d) => d.tags.map((t) => t.toLowerCase()).includes(tgt));
}

// --- exports expected by your routes ----------------------------------
// Use env vars to customize folders; defaults match your route structure.

const BLOG_DIR = process.env.CONTENT_BLOG_DIR || "content/blog";
const CWS_DIR = process.env.CONTENT_CWS_DIR || "content/cws"; // Survivor recaps
const HOLDEM_DIR = process.env.CONTENT_HOLDEM_DIR || "content/holdem-foldem";

export async function getPosts() {
  return collectAll([{ key: "post", dir: BLOG_DIR, visible: (fm) => !fm.draft }]);
}

export async function getRecaps() {
  return collectAll([{ key: "recap", dir: CWS_DIR, visible: (fm) => !fm.draft }]);
}

export async function getHoldem() {
  return collectAll([{ key: "holdem", dir: HOLDEM_DIR, visible: (fm) => !fm.draft }]);
}

export async function getAllContentIndex() {
  const docs = await collectAll([
    { key: "post", dir: BLOG_DIR, visible: (fm) => !fm.draft },
    { key: "recap", dir: CWS_DIR, visible: (fm) => !fm.draft },
    { key: "holdem", dir: HOLDEM_DIR, visible: (fm) => !fm.draft },
  ]);
  // Return a lean index by default (safe for search endpoints)
  return docs.map((d) => ({
    kind: d.kind,
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt,
    tags: d.tags,
    date: d.date,
  }));
}

// Optional default export for convenience
export default {
  collectAll,
  getPosts,
  getRecaps,
  getHoldem,
  getAllContentIndex,
  tagCounts,
  filterByTag,
};
