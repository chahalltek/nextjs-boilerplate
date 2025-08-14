// app/api/admin/posts/[slug]/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFile, createOrUpdateFile, deleteFile } from "@/lib/github";

// ⚠️ Make sure this matches whatever your reader in `lib/posts` uses.
const POSTS_DIR = "content/blog"; // or "content/posts"
const postPath = (slug) => `${POSTS_DIR}/${slug}.md`;

// GET a post's raw Markdown (for the admin editor)
export async function GET(_req, { params }) {
  try {
    const path = postPath(params.slug);
    const file = await getFile(path); // { content: base64, sha, ... }
    const content = Buffer.from(file.content, "base64").toString("utf8");

    return NextResponse.json({
      ok: true,
      data: { content, sha: file.sha, path },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Not found" },
      { status: 404 }
    );
  }
}

// CREATE/UPDATE a post
export async function PUT(req, { params }) {
  try {
    const slug = params.slug;
    const path = postPath(slug);

    // Expect: { content: string, sha?: string, message?: string }
    const { content, sha, message } = await req.json();

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing or empty 'content'." },
        { status: 400 }
      );
    }

    const commitMsg = message || `post: upsert ${slug}`;
    const result = await createOrUpdateFile(path, content, commitMsg, sha);

    return NextResponse.json({ ok: true, path, result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

// DELETE a post
export async function DELETE(_req, { params }) {
  try {
    const slug = params.slug;
    const path = postPath(slug);

    // Get current sha (GitHub requires it to delete)
    const existing = await getFile(path).catch(() => null);
    const sha = existing?.sha;

    await deleteFile(path, `post: delete ${slug}`, sha);
    return NextResponse.json({ ok: true, path });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
