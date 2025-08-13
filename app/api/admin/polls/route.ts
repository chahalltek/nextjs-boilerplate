import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import matter from "gray-matter";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

const DIR = path.join(process.cwd(), "content", "survivor");

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function GET() {
  if (!fs.existsSync(DIR)) return NextResponse.json({ ok: true, items: [] });
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));
  const items = files.map((f) => {
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(DIR, f), "utf8");
    const fm = matter(raw);
    const d = fm.data as any;
    return {
      slug,
      title: d.title || "",
      date: d.date || "",
      excerpt: d.excerpt || "",
      draft: d.draft === true,
    };
  });
  // return everything for admin (including drafts)
  items.sort((a, b) => +new Date(b.date || 0) - +new Date(a.date || 0));
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const data = await req.json();
  const {
    title = "",
    date = new Date().toISOString().slice(0, 10),
    excerpt = "",
    provider = "hyvor",
    embed = "",
    content = "",
    draft = true,
    slug = "",
  } = data;

  const fileSlug = slugify(slug || title || "poll");
  const filePath = `content/survivor/${fileSlug}.md`;

  const md = matter.stringify(content, { title, date, excerpt, provider, embed, draft });
  const res = await createOrUpdateFile(filePath, Buffer.from(md).toString("base64"), `Create poll ${filePath}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });

  return NextResponse.json({ ok: true, slug: fileSlug });
}
