// app/api/admin/recaps/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, commitFile, deleteFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/recaps";

export async function GET(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = params?.slug;
    const path = `${DIR}/${slug}.md`;
    const file = await getFile(path);
    if (!file) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
    const parsed = matter(raw);
    return NextResponse.json({
      ok: true,
      data: {
        slug,
        ...parsed.data,
        content: parsed.content || "",
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = params?.slug;
    const path = `${DIR}/${slug}.md`;
    const body = await request.json().catch(() => ({}));
    const { title, date, excerpt, published, content } = body || {};
    if (!title) return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });

    const md = matter.stringify(content || "", {
      title,
      date: date || new Date().toISOString().slice(0, 10),
      excerpt: excerpt || "",
      published: !!published,
    });

    const base64 = Buffer.from(md, "utf8").toString("base64");
    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: `recap update: ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  // convenience: toggle published without resending content
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = params?.slug;
    const path = `${DIR}/${slug}.md`;

    const file = await getFile(path);
    if (!file?.contentBase64) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
    const parsed = matter(raw);
    const body = await request.json().catch(() => ({}));
    const { published } = body || {};

    const md = matter.stringify(parsed.content || "", {
      ...parsed.data,
      published: !!published,
    });

    const base64 = Buffer.from(md, "utf8").toString("base64");
    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: `recap publish: ${slug} -> ${!!published}`,
    });

    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const slug = params?.slug;
    const path = `${DIR}/${slug}.md`;
    const gh = await deleteFile({ path, message: `recap delete: ${slug}` });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
