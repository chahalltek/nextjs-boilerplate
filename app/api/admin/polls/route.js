import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, commitFile, deleteFile } from "@/lib/github";

const POSTS_DIR = "content/posts";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const path = `${POSTS_DIR}/${params.slug}.md`;
    const file = await getFile(path);
    if (!file) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: { content: file.content } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const { content } = await req.json();
    if (!content || !String(content).trim()) {
      return NextResponse.json({ ok: false, error: "Empty content" }, { status: 400 });
    }
    const path = `${POSTS_DIR}/${params.slug}.md`;
    await commitFile({ path, content, message: `Save post ${params.slug}.md` });
    return NextResponse.json({ ok: true, path });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const path = `${POSTS_DIR}/${params.slug}.md`;
    await deleteFile(path, `Delete post ${params.slug}.md`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
