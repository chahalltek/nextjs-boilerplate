// lib/newsletter/collectors.ts
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export type SimplePost = {
  slug: string;
  title: string;
  date?: string;
  excerpt?: string;
  body?: string;         // full MD
  href?: string;         // site URL we’ll link to
};

export type Poll = {
  id: string;
  question: string;
  options?: Array<{ id: string; text: string; votes?: number }>;
  date?: string;
};

function toTime(d?: string) {
  if (!d) return 0;
  const t = new Date(d).valueOf();
  return Number.isFinite(t) ? t : 0;
}

async function readDirSafe(dir: string) {
  try { return await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
}

async function readFileSafe(f: string) {
  try { return await fs.readFile(f, "utf8"); } catch { return ""; }
}

// ---------- BLOG: app/content/posts (fallback to content/posts) ----------
export async function collectBlog(limit = 3): Promise<SimplePost[]> {
  const candidates = [
    path.join(process.cwd(), "app", "content", "posts"),
    path.join(process.cwd(), "content", "posts"), // fallback (your blog index used this earlier)
  ];
  let files: Array<{ full: string; name: string }> = [];
  for (const dir of candidates) {
    const items = await readDirSafe(dir);
    const picked = items
      .filter((d) => d.isFile() && /\.mdx?$/i.test(d.name))
      .map((d) => ({ full: path.join(dir, d.name), name: d.name }));
    if (picked.length) { files = picked; break; }
  }
  const posts: SimplePost[] = [];
  for (const f of files) {
    const raw = await readFileSafe(f.full);
    if (!raw) continue;
    const parsed = matter(raw);
    const fm = parsed.data || {};
    const slug = f.name.replace(/\.(md|mdx)$/i, "");
    posts.push({
      slug,
      title: fm.title || slug,
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      body: parsed.content || "",
      href: `/blog/${encodeURIComponent(slug)}`,
    });
  }
  posts.sort((a, b) => toTime(b.date) - toTime(a.date));
  return posts.slice(0, limit);
}

// ---------- RECAPS: app/content/recaps ----------
export async function collectRecaps(limit = 2): Promise<SimplePost[]> {
  const dir = path.join(process.cwd(), "app", "content", "recaps");
  const items = await readDirSafe(dir);
  const files = items.filter((d) => d.isFile() && /\.mdx?$/i.test(d.name));
  const recaps: SimplePost[] = [];
  for (const d of files) {
    const raw = await readFileSafe(path.join(dir, d.name));
    if (!raw) continue;
    const parsed = matter(raw);
    const fm = parsed.data || {};
    const slug = d.name.replace(/\.(md|mdx)$/i, "");
    recaps.push({
      slug,
      title: fm.title || `Weekly Recap: ${slug}`,
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      body: parsed.content || "",
      href: `/recaps/${encodeURIComponent(slug)}`, // adjust if your route differs
    });
  }
  recaps.sort((a, b) => toTime(b.date) - toTime(a.date));
  return recaps.slice(0, limit);
}

// ---------- SURVIVOR POLLS: data/polls (dir or single json) ----------
export async function collectSurvivorPolls(limit = 3): Promise<Poll[]> {
  const baseDir = path.join(process.cwd(), "data", "polls");
  const dirItems = await readDirSafe(baseDir);
  let polls: Poll[] = [];

  if (dirItems.length) {
    // read all *.json files under data/polls
    for (const it of dirItems) {
      if (it.isFile() && /\.json$/i.test(it.name)) {
        const raw = await readFileSafe(path.join(baseDir, it.name));
        if (!raw) continue;
        try {
          const doc = JSON.parse(raw);
          const arr: Poll[] = Array.isArray(doc) ? doc : (Array.isArray(doc?.polls) ? doc.polls : [doc]);
          for (const p of arr) {
            if (p && p.id && p.question) polls.push(p);
          }
        } catch {}
      }
    }
  } else {
    // maybe data/polls.json at project root
    const single = path.join(process.cwd(), "data", "polls.json");
    const raw = await readFileSafe(single);
    if (raw) {
      try {
        const doc = JSON.parse(raw);
        polls = Array.isArray(doc) ? doc : (Array.isArray(doc?.polls) ? doc.polls : []);
      } catch {}
    }
  }

  // Newest first by date (if present)
  polls.sort((a, b) => toTime(b.date) - toTime(a.date));
  return polls.slice(0, limit);
}
