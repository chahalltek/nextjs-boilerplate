// lib/posts.js
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

export function getAllSlugs() {
  if (!exists(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith(".md") || f.endsWith(".mdx"))
    .map(f => f.replace(/\.mdx?$/, ""));
}

export function getPostBySlug(slug) {
  const file = [".md", ".mdx"]
    .map(ext => path.join(POSTS_DIR, `${slug}${ext}`))
    .find(exists);
  if (!file) return null;

  const source = fs.readFileSync(file, "utf8");
  const { data, content } = matter(source);

  return {
    slug,
    title: data.title || slug,
    date: data.date || null,
    excerpt: data.excerpt || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    draft: data.draft === true,
    content,
  };
}

export function getAllPosts() {
  return getAllSlugs()
    .map(getPostBySlug)
    .filter(Boolean)
    .sort((a, b) => (new Date(b.date || 0)) - (new Date(a.date || 0)));
}
