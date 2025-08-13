// lib/survivorPolls.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content", "survivor");

function safeRead(p: string) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

export type SurvivorPoll = {
  slug: string;
  title?: string;
  date?: string;
  excerpt?: string;
  draft?: boolean;
  provider?: string;
  embed?: string;   // raw HTML embed from Hyvor Polls
  content?: string; // optional intro text
};

export function getAllSurvivorPolls(): SurvivorPoll[] {
  if (!fs.existsSync(DIR)) return [];
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));
  const items = files.map((f) => {
    const slug = f.replace(/\.md$/, "");
    const raw = safeRead(path.join(DIR, f));
    const fm = matter(raw);
    const data = fm.data as any;
    return {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt,
      draft: data.draft === true,
      provider: data.provider,
      embed: data.embed,
      content: fm.content,
    };
  });
  const showDrafts = process.env.SHOW_DRAFTS === "1";
  return items
    .filter((p) => showDrafts || !p.draft)
    .sort((a, b) => +new Date(b.date || 0) - +new Date(a.date || 0));
}

export function getPollBySlug(slug: string): SurvivorPoll | null {
  const p = path.join(DIR, `${slug}.md`);
  if (!fs.existsSync(p)) return null;
  const raw = safeRead(p);
  const fm = matter(raw);
  const data = fm.data as any;
  return {
    slug,
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    draft: data.draft === true,
    provider: data.provider,
    embed: data.embed,
    content: fm.content,
  };
}
