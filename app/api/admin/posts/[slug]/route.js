// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, commitFile, deleteFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTS_DIR = "content/posts";

function toBase64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}
function fromBase64(b64) {
  return Buffer.from(b64, "base64").toString("utf8");
}

function buildMarkdown({ title, excerpt, content, date, draft }) {
  // Keep front-matter tidy
  const data = {
    ...(title ? { title } : {}),
    ...(excerpt ? { excerpt } : {}),
    ...(date ? { date } : {}),
    ...(typeof draft === "boolean" ? { draft } : {}),
  };
  return matter.stringify(content || "", data);
}

// GET (optional) – returns raw markdown (used by editor preview if you need it)
export async function GET(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  const path = `${POSTS_DIR}/${slug}.md`;

  const file = await getFile(path);
  if (!file) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const md = fromBase64(file.contentBase64);
  return NextResponse.json({ ok: true, content: md });
}

// PUT – create/update a post
export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  const body = await request.json().catch(() => ({}));
  const { title, excerpt, content, date, draft } = body || {};

  if (!slug || !title || !content) {
    return NextResponse.json(
      { ok: false, error: "Missing slug, title or content" },
      { status: 400 }
    );
  }

  const markdown = buildMarkdown({ title, excerpt, content, date, draft });
  const path = `${POSTS_DIR}/${slug}.md`;

  try {
    const gh = await commitFile({
      path,
      contentBase64: toBase64(markdown),
      message: `post: save ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// PATCH – toggle draft flag (hide/unhide)
export async function PATCH(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  const { draft } = (await request.json().catch(() => ({}))) || {};
  if (typeof draft !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "PATCH body must include { draft: boolean }" },
      { status: 400 }
    );
  }

  const path = `${POSTS_DIR}/${slug}.md`;

  try {
    const file = await getFile(path);
    if (!file) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const md = fromBase64(file.contentBase64);
    const parsed = matter(md);
    parsed.data = { ...parsed.data, draft };
    const newMd = matter.stringify(parsed.content, parsed.data);

    const gh = await commitFile({
      path,
      contentBase64: toBase64(newMd),
      message: draft ? `post: set draft ${slug}` : `post: publish ${slug}`,
    });

    return NextResponse.json({ ok: true, commit: gh.commit, draft });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// DELETE – permanently remove the markdown file
export async function DELETE(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  const path = `${POSTS_DIR}/${slug}.md`;

  try {
    const gh = await deleteFile({ path, message: `post: delete ${slug}` });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
