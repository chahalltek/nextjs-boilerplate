import { NextResponse } from "next/server";
import matter from "gray-matter";
import { createOrUpdateFile, getFile, listMarkdownIn } from "@/lib/github";

export const runtime = "nodejs";

export async function GET() {
  // list posts from GitHub
  const files = await listMarkdownIn("content/posts");
  const items = [];
  for (const name of files) {
    const slug = name.replace(/\.md$/, "");
    const raw = await getFile(`content/posts/${name}`);
    if (!raw) continue;
    const fm = matter(raw);
    items.push({
      slug,
      title: fm.data.title || slug,
      date: fm.data.date || "",
      excerpt: fm.data.excerpt || "",
      tags: fm.data.tags || [],
      draft: fm.data.draft === true,
    });
  }
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return NextResponse.json({ ok: true, items });
}

export async function POST(req) {
  const data = await req.json();
  const { title, date, excerpt, tags = [], slug, content = "", draft = true } = data;

  const fm = matter.stringify(content, { title, date, excerpt, tags, draft });
  const fileSlug = (slug || title || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const path = `content/posts/${fileSlug}.md`;

  const res = await createOrUpdateFile(path, Buffer.from(fm).toString("base64"), `Create post ${path}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });
  return NextResponse.json({ ok: true, slug: fileSlug });
}