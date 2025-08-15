// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, commitFile, deleteFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_DIR = "content/posts";

function err(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
function ok(data) {
  return NextResponse.json({ ok: true, ...(data || {}) });
}

// Fetch an existing post (raw md for the admin UI)
export async function GET(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) return err("Missing slug");

  const path = `${BASE_DIR}/${slug}.md`;
  try {
    const f = await getFile(path);
    if (!f) return err("Not found", 404);
    const md = Buffer.from(f.contentBase64, "base64").toString("utf8");
    return ok({ path, content: md });
  } catch (e) {
    return err(String(e?.message || e), 500);
  }
}

// Upsert a post
export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) return err("Missing slug");

  let body = {};
  try { body = await request.json(); } catch {}
  const { title, excerpt = "", content = "", date } = body || {};
  if (!title || !content) return err("Missing title or content");

  const fmLines = [
    "---",
    `title: ${JSON.stringify(title)}`,
    ...(excerpt ? [`excerpt: ${JSON.stringify(excerpt)}`] : []),
    ...(date ? [`date: ${JSON.stringify(date)}`] : []),
    "---",
    "",
  ];
  const md = fmLines.join("\n") + String(content);

  const path = `${BASE_DIR}/${slug}.md`;
  try {
    const base64 = Buffer.from(md, "utf8").toString("base64");
    const gh = await commitFile({
      path,
      contentBase64: base64,
      message: `post: ${slug}`,
      sha: undefined, // TS friendly
    });
    return ok({ commit: gh.commit, path });
  } catch (e) {
    return err(String(e?.message || e), 500);
  }
}

// Delete a post
export async function DELETE(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) return err("Missing slug");

  const path = `${BASE_DIR}/${slug}.md`;
  try {
    const gh = await deleteFile({ path, message: `delete post: ${slug}` });
    return ok({ commit: gh.commit, path });
  } catch (e) {
    return err(String(e?.message || e), 500);
  }
}
