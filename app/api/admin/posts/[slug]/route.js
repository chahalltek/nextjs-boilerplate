// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, commitFile, deleteFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = (slug) => `content/blog/${slug}.md`;

export async function GET(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;
  const slug = params.slug;

  try {
    const f = await getFile(FILE(slug));
    if (!f) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const md = Buffer.from(f.contentBase64, "base64").toString("utf8");
    const parsed = matter(md);
    const { title = "", excerpt = "", date = "" } = parsed.data || {};
    return NextResponse.json({
      ok: true,
      data: { slug, title, excerpt, date, content: parsed.content || "" },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;
  const slug = params.slug;

  try {
    const body = await request.json();
    const { title = "", excerpt = "", date = "", content = "" } = body || {};
    if (!title || !content) {
      return NextResponse.json({ ok: false, error: "title and content required" }, { status: 400 });
    }
    const md = matter.stringify(content, { title, excerpt, date });
    const base64 = Buffer.from(md, "utf8").toString("base64");
    const gh = await commitFile({
      path: FILE(slug),
      contentBase64: base64,
      message: `post: ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;
  const slug = params.slug;

  try {
    const gh = await deleteFile({ path: FILE(slug), message: `delete post: ${slug}` });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
