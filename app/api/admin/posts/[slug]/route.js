// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, createOrUpdateFile, deleteFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adjust to match your reader in lib/posts
const PATH_BLOG = "content/blog";

// GET (optional) - fetch an existing post for edit UI
export async function GET(_req, { params }) {
  const denied = requireAdmin?.(_req);
  if (denied) return denied;

  try {
    const slug = params?.slug;
    if (!slug) return NextResponse.json({ ok: false, error: "missing slug" }, { status: 400 });

    const fullPath = `${PATH_BLOG}/${slug}.md`;
    const file = await getFile(fullPath);
    if (!file) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    return NextResponse.json({ ok: true, data: { content: file.content } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

// PUT - create/update a post
export async function PUT(req, { params }) {
  const denied = requireAdmin?.(req);
  if (denied) return denied;

  try {
    const slug = params?.slug;
    if (!slug) return NextResponse.json({ ok: false, error: "missing slug" }, { status: 400 });

    const body = await req.json();
    const { title, excerpt = "", content = "", date } = body || {};
    if (!title || !content) {
      return NextResponse.json(
        { ok: false, error: "title and content are required" },
        { status: 400 }
      );
    }

    // Build frontmatter + body
    const fm = matter.stringify(content, {
      title,
      excerpt,
      ...(date ? { date } : {}),
      slug,
    });

    const fullPath = `${PATH_BLOG}/${slug}.md`;
    const res = await createOrUpdateFile(fullPath, fm, `feat(blog): upsert post ${slug}`);

    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" }).catch(() => {});
    }

    return NextResponse.json({ ok: true, path: fullPath, commit: res?.sha || null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

// DELETE - remove a post
export async function DELETE(req, { params }) {
  const denied = requireAdmin?.(req);
  if (denied) return denied;

  try {
    const slug = params?.slug;
    if (!slug) return NextResponse.json({ ok: false, error: "missing slug" }, { status: 400 });

    const fullPath = `${PATH_BLOG}/${slug}.md`;
    const res = await deleteFile(fullPath, `feat(blog): delete post ${slug}`);

    if (!res.ok && res.reason === "not_found") {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" }).catch(() => {});
    }

    return NextResponse.json({ ok: true, path: fullPath });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
