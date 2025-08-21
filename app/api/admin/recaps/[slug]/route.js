// app/api/admin/recaps/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, commitFile, deleteFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/recaps";

// keep slugs safe and consistent
function cleanSlug(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function b64ToUtf8(b64 = "") {
  return Buffer.from(b64, "base64").toString("utf8");
}
function utf8ToB64(s = "") {
  return Buffer.from(s, "utf8").toString("base64");
}

/**
 * GET /api/admin/recaps/[slug]
 * Returns front-matter + raw markdown content for editor prefill.
 */
export async function GET(req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = cleanSlug(params?.slug);
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Bad slug" }, { status: 400 });
    }

    const path = `${DIR}/${slug}.md`;
    const file = await getFile(path).catch(() => null);
    if (!file?.contentBase64) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const raw = b64ToUtf8(file.contentBase64);
    const parsed = matter(raw);

    return NextResponse.json({
      ok: true,
      data: {
        slug,
        // expose the front-matter we know about (others pass through too)
        ...parsed.data,
        content: parsed.content || "",
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/recaps/[slug]
 * Upserts the recap with provided front-matter + content.
 */
export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = cleanSlug(params?.slug);
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Bad slug" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, date, excerpt, published, content } = body || {};
    if (!title) {
      return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });
    }

    const md = matter.stringify(content || "", {
      title,
      date: date || new Date().toISOString().slice(0, 10),
      excerpt: excerpt || "",
      published: !!published,
    });

    const gh = await commitFile({
      path: `${DIR}/${slug}.md`,
      contentBase64: utf8ToB64(md),
      message: `recap update: ${slug}`,
    });

    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/recaps/[slug]
 * Convenience toggle for { published } without resending content.
 */
export async function PATCH(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = cleanSlug(params?.slug);
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Bad slug" }, { status: 400 });
    }

    const path = `${DIR}/${slug}.md`;
    const file = await getFile(path).catch(() => null);
    if (!file?.contentBase64) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const raw = b64ToUtf8(file.contentBase64);
    const parsed = matter(raw);
    const body = await request.json().catch(() => ({}));
    const { published } = body || {};

    const md = matter.stringify(parsed.content || "", {
      ...parsed.data,
      published: !!published,
    });

    const gh = await commitFile({
      path,
      contentBase64: utf8ToB64(md),
      message: `recap publish: ${slug} -> ${!!published}`,
    });

    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/recaps/[slug]
 * Deletes the recap file.
 */
export async function DELETE(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = cleanSlug(params?.slug);
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Bad slug" }, { status: 400 });
    }

    const gh = await deleteFile({
      path: `${DIR}/${slug}.md`,
      message: `recap delete: ${slug}`,
    });

    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
