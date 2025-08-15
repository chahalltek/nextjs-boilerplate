// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, getFile, deleteFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTS_DIR = "content/posts";

export async function GET(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params || {};
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  const path = `${POSTS_DIR}/${slug}.md`;
  try {
    const f = await getFile(path);
    if (!f) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    const content = Buffer.from(f.contentBase64, "base64").toString("utf8");
    return NextResponse.json({ ok: true, data: { content } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params || {};
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const { content } = body || {};
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ ok: false, error: "Missing content" }, { status: 400 });
  }

  const path = `${POSTS_DIR}/${slug}.md`;
  try {
    const base64 = Buffer.from(content, "utf8").toString("base64");
    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: `post: ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: gh.commit, path });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params || {};
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  const path = `${POSTS_DIR}/${slug}.md`;
  try {
    const gh = await deleteFile({ path, message: `delete post: ${slug}` });
    return NextResponse.json({ ok: true, commit: gh.commit, path });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
