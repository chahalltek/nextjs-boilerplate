// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, deleteFile, getFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTS_DIR = "content/posts";

function frontmatter({ title, excerpt, date }) {
  const fm = {
    title: title || "",
    ...(excerpt ? { excerpt } : {}),
    ...(date ? { date } : {}),
  };
  const yaml =
    Object.entries(fm)
      .map(([k, v]) => `${k}: ${String(v).replace(/\n/g, " ")}`)
      .join("\n");
  return `---\n${yaml}\n---\n\n`;
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = (params?.slug || "").toString().trim().toLowerCase();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({}));
    const { title, excerpt, content, date } = body || {};
    if (!title || !content) {
      return NextResponse.json({ ok: false, error: "Missing title or content" }, { status: 400 });
    }

    const md = frontmatter({ title, excerpt, date }) + content + "\n";
    const base64 = Buffer.from(md, "utf8").toString("base64");
    const filePath = `${POSTS_DIR}/${slug}.md`;

    const gh = await commitFile({
      path: filePath,
      contentBase64: base64,
      message: `post: ${slug}`,
      sha: undefined,
    });

    return NextResponse.json({ ok: true, commit: gh.commit, path: filePath });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = (params?.slug || "").toString().trim();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  try {
    const filePath = `${POSTS_DIR}/${slug}.md`;
    const gh = await deleteFile({ path: filePath, message: `delete post: ${slug}` });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// (optional) GET for debugging from the browser
export async function GET(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = (params?.slug || "").toString().trim();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  try {
    const filePath = `${POSTS_DIR}/${slug}.md`;
    const got = await getFile(filePath);
    return NextResponse.json({ ok: true, exists: !!got, path: filePath });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
