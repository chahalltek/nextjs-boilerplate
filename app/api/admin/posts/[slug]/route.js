import { NextResponse } from "next/server";
import matter from "gray-matter";
import { requireAdminAuth } from "@/lib/adminAuth";
import { createOrUpdateFile, getFile, deleteFile } from "@/lib/github";

export const runtime = "nodejs";

// Optional: fetch one post (only if you use GitHub as the source here)
export async function GET(request, { params }) {
  const guard = requireAdminAuth(request);
  if (guard) return guard;

  try {
    const filePath = `content/posts/${params.slug}.md`;
    if (typeof getFile !== "function") {
      return NextResponse.json({ ok: false, error: "get-not-implemented" }, { status: 501 });
    }
    const file = await getFile(filePath);
    if (!file?.content) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
    const raw = Buffer.from(file.content, "base64").toString("utf8");
    const fm = matter(raw);
    return NextResponse.json({ ok: true, data: { ...fm.data, content: fm.content } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "fetch-failed" }, { status: 500 });
  }
}

// Update a post
export async function PUT(request, { params }) {
  const guard = requireAdminAuth(request);
  if (guard) return guard;

  const data = await request.json();
  const { title, date, excerpt, tags = [], content = "", draft = true } = data;

  const fm = matter.stringify(content, { title, date, excerpt, tags, draft });
  const path = `content/posts/${params.slug}.md`;

  const res = await createOrUpdateFile(path, Buffer.from(fm, "utf8").toString("base64"), `Update post ${path}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Delete a post
export async function DELETE(request, { params }) {
  const guard = requireAdminAuth(request);
  if (guard) return guard;

  if (typeof deleteFile !== "function") {
    return NextResponse.json({ ok: false, error: "delete-not-implemented" }, { status: 501 });
  }
  const path = `content/posts/${params.slug}.md`;
  const res = await deleteFile(path, `Delete post ${path}`);
  if (!res.ok) return NextResponse.json(res, { status: 500 });
  return NextResponse.json({ ok: true });
}
