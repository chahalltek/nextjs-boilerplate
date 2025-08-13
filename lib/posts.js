// lib/posts.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function safeExists(p: string) {
  try { return fs.existsSync(p); } catch { return false; }
}

export function getAllPosts() {
  try {
    if (!safeExists(POSTS_DIR)) return [];
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md"));
    const posts = files.map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const fm = matter(raw);
      return { slug, ...fm.data, content: fm.content } as any;
    });
    const showDrafts = process.env.SHOW_DRAFTS === "1";
    return posts.filter(p => showDrafts || !p.draft);
  } catch (err) {
    console.error("getAllPosts failed:", err);
    return [];
  }
}

export function getPostBySlug(slug: string) {
  try {
    const file = path.join(POSTS_DIR, `${slug}.md`);
    if (!safeExists(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    const fm = matter(raw);
    return { slug, ...fm.data, content: fm.content } as any;
  } catch (err) {
    console.error("getPostBySlug failed:", slug, err);
    return null;
  }
}
