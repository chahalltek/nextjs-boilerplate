// lib/contentIndex.js
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

const POSTS_DIR  = "content/posts";
const RECAPS_DIR = "content/recaps";
const HOLDEM_DIR = "content/holdem";
const POLLS_DIR  = "data/polls";

function b64ToUtf8(b64) {
  return Buffer.from(b64, "base64").toString("utf8");
}

async function readMarkdownDir(dir, mapUrl) {
  const items = await listDir(dir).catch(() => []);
  const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));
  const out = [];

  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;
    const raw = b64ToUtf8(file.contentBase64);
    const parsed = matter(raw);
    const fm = parsed.data || {};
    const slug = f.name.replace(/\.md$/, "");
    out.push({
      type: mapUrl.section,
      slug,
      title: fm.title || slug,
      excerpt: fm.excerpt || "",
      date: fm.date || "",
      url: mapUrl.href(slug),
      rawContent: parsed.content || "",
      published: fm.published !== false && fm.draft !== true, // default true
    });
  }

  // newest first by date, fallback to slug
  out.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return out;
}

export async function getPosts() {
  return readMarkdownDir(POSTS_DIR, {
    section: "blog",
    href: (slug) => `/blog/${encodeURIComponent(slug)}`,
  });
}

export async function getRecaps() {
  return readMarkdownDir(RECAPS_DIR, {
    section: "recap",
    href: (slug) => `/cws/${encodeURIComponent(slug)}`,
  });
}

export async function getHoldem() {
  return readMarkdownDir(HOLDEM_DIR, {
    section: "holdem",
    href: (slug) => `/holdem-foldem/${encodeURIComponent(slug)}`,
  });
}

export async function getActivePolls() {
  const items = await listDir(POLLS_DIR).catch(() => []);
  const files = items.filter((it) => it.type === "file" && it.name.endsWith(".json"));
  const out = [];

  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;
    const raw = b64ToUtf8(file.contentBase64);
    let json;
    try { json = JSON.parse(raw); } catch { continue; }
    if (!json?.active) continue;

    const slug = f.name.replace(/\.json$/, "");
    const question = json.question || slug;
    out.push({
      type: "poll",
      slug,
      title: question,
      excerpt: Array.isArray(json.options)
        ? json.options.map((o) => o.label).filter(Boolean).join(" · ")
        : "",
      date: json.updatedAt || json.createdAt || "",
      url: `/survivor?poll=${encodeURIComponent(slug)}`,
      published: true,
    });
  }

  out.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
  return out;
}

export async function getAllContentIndex() {
  const [posts, recaps, holdem, polls] = await Promise.all([
    getPosts(),
    getRecaps(),
    getHoldem(),
    getActivePolls(),
  ]);

  // Only show items that are published/visible
  const visible = (arr) => arr.filter((x) => x.published !== false);

  return [
    ...visible(posts),
    ...visible(recaps),
    ...visible(holdem),
    ...visible(polls),
  ];
}
