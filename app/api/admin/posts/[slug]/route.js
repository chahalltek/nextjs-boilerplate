// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, getFile, deleteFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTS_DIR = "content/posts";

/** Build markdown with YAML front-matter from fields sent by the UI */
function buildMarkdown({ title, excerpt, date, content }) {
  const fm = [];
  if (title)  fm.push(`title: ${yamlEscape(title)}`);
  if (excerpt) fm.push(`excerpt: ${yamlEscape(excerpt)}`);
  if (date)   fm.push(`date: ${yamlEscape(date)}`); // keep as provided (e.g., 2025-08-15)

  const front = fm.length ? `---\n${fm.join("\n")}\n---\n\n` : "";
  return `${front}${content || ""}`.trim() + "\n";
}

// naive YAML escaper good enough for typical titles/excerpts/dates
function yamlEscape(s) {
  if (/[":{}[\],&*#?|\-<>=!%@`]/.test(s) || /\s/.test(s)) {
    // wrap in double quotes and escape inner quotes/backslashes
    return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return String(s);
}

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
    if (!f) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
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

  const { title, excerpt, date, content } = body || {};
  if (!title || !content) {
    return NextResponse.json({ ok: false, error: "Missing title or content" }, { status: 400 });
  }

  const md = buildMarkdown({ title, excerpt, date, content });
  const base64 = Buffer.from(md, "utf8").toString("base64");
  const path = `${POSTS_DIR}/${slug}.md`;

  try {
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
