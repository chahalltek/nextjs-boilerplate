import { NextResponse } from "next/server";
import matter from "gray-matter";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";

// List posts (stub OK if you already list from FS elsewhere)
export async function GET(request) {
  const guard = requireAdminAuth(request);
  if (guard) return guard;

  // If you already have a list implementation, keep it.
  // Returning an empty list here keeps build green.
  return NextResponse.json({ ok: true, items: [] });
}

// Create a post
export async function POST(request) {
  const guard = requireAdminAuth(request);
  if (guard) return guard;

  const data = await request.json();
  const { title, date, excerpt, tags = [], slug, content = "", draft = true } = data;

  const fileSlug = (slug || title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!fileSlug) {
    return NextResponse.json({ ok: false, error: "missing-title-or-slug" }, { status: 400 });
  }

  const fm = matter.stringify(content, { title, date, excerpt, tags, draft });
  const path = `content/posts/${fileSlug}.md`;

  const res = await createOrUpdateFile(path, Buffer.from(fm, "utf8").toString("base64"), `Create post ${path}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });

  return NextResponse.json({ ok: true, slug: fileSlug });
}
