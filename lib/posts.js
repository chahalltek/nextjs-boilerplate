// lib/posts.js
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

export function getAllPosts() {
  try {
    if (!safeExists(POSTS_DIR)) return [];

    const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

    const posts = files.map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const fm = matter(raw);
      const data = fm.data || {};
      return {
        slug,
        title: data.title || slug,
        date: data.date || null,
        excerpt: data.excerpt || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        draft: data.draft === true,
        content: fm.content || "",
      };
    });

    const showDrafts = process.env.SHOW_DRAFTS === "1";
    const visible = posts.filter((p) => showDrafts || !p.draft);

    // sort newest first if dates exist
    visible.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    return visible;
  } catch (err) {
    console.error("getAllPosts failed:", err);
    return [];
  }
}

export function getPostBySlug(slug) {
  try {
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    if (!safeExists(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf8");
    const fm = matter(raw);
    const data = fm.data || {};

    return {
      slug,
      title: data.title || slug,
      date: data.date || null,
      excerpt: data.excerpt || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      draft: data.draft === true,
      content: fm.content || "",
    };
  } catch (err) {
    console.error("getPostBySlug failed:", slug, err);
    return null;
  }
}
