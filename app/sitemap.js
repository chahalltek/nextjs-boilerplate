// app/sitemap.js
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";

const SITE_URL = (process.env.SITE_URL || "https://www.heyskolsister.com").replace(/\/+$/,"");

// Directories in the repo
const POSTS_DIR   = "content/posts";
const RECAPS_DIR  = "content/recaps";
const HOLDEM_DIR  = "content/holdem";

// Helper: safely list a directory
async function safeList(dir) {
  try { return await listDir(dir); } catch { return []; }
}

// Helper: read a markdown file’s date from front-matter
async function readDateFromFM(path) {
  try {
    const file = await getFile(path);
    if (!file?.contentBase64) return null;
    const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
    const { data } = matter(raw);
    return data?.date || null;
  } catch {
    return null;
  }
}

export default async function sitemap() {
  const staticRoutes = [
    "/", "/start-sit", "/blog", "/about", "/101",
    "/cws", "/survivor", "/holdem-foldem",
    "/subscribe", "/privacy", "/search",
  ].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: new Date().toISOString() }));

  const out = [...staticRoutes];

  // Blog posts
  const postFiles = (await safeList(POSTS_DIR))
    .filter((it) => it.type === "file" && it.name.endsWith(".md"));
  for (const f of postFiles) {
    const slug = f.name.replace(/\.md$/, "");
    const date = await readDateFromFM(f.path);
    out.push({
      url: `${SITE_URL}/blog/${encodeURIComponent(slug)}`,
      lastModified: (date || new Date().toISOString()),
    });
  }

  // Weekly recaps (only published)
  const recapFiles = (await safeList(RECAPS_DIR))
    .filter((it) => it.type === "file" && it.name.endsWith(".md"));
  for (const f of recapFiles) {
    // Check published flag
    let ok = true, lastMod = null;
    try {
      const file = await getFile(f.path);
      const raw = Buffer.from(file.contentBase64 || "", "base64").toString("utf8");
      const parsed = matter(raw);
      ok = parsed?.data?.published !== false; // default true
      lastMod = parsed?.data?.date || null;
    } catch {}
    if (!ok) continue;

    const slug = f.name.replace(/\.md$/, "");
    out.push({
      url: `${SITE_URL}/cws/${encodeURIComponent(slug)}`,
      lastModified: (lastMod || new Date().toISOString()),
    });
  }

  // Hold 'em / Fold 'em (only published)
  const holdemFiles = (await safeList(HOLDEM_DIR))
    .filter((it) => it.type === "file" && it.name.endsWith(".md"));
  for (const f of holdemFiles) {
    let ok = true, lastMod = null;
    try {
      const file = await getFile(f.path);
      const raw = Buffer.from(file.contentBase64 || "", "base64").toString("utf8");
      const parsed = matter(raw);
      ok = parsed?.data?.published !== false; // default true
      lastMod = parsed?.data?.date || null;
    } catch {}
    if (!ok) continue;

    const slug = f.name.replace(/\.md$/, "");
    out.push({
      url: `${SITE_URL}/holdem-foldem/${encodeURIComponent(slug)}`,
      lastModified: (lastMod || new Date().toISOString()),
    });
  }

  return out;
}
