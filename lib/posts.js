import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

export function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const fm = matter(raw);
    return { slug, ...fm.data, excerpt: fm.data.excerpt || "", content: fm.content };
  });
  const showDrafts = process.env.SHOW_DRAFTS === "1";
  return posts
    .filter((p) => showDrafts || !p.draft)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function getPostBySlug(slug) {
  const file = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const fm = matter(raw);
  return { slug, ...fm.data, excerpt: fm.data.excerpt || "", content: fm.content };
}