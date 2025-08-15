// app/api/admin/posts/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  let { slug, title, excerpt, cover, content, date } = body || {};
  slug = String(slug || "").trim();

  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  // build markdown from fields if content is not a full raw md
  let markdown;
  if (typeof content === "string" && content.trim().length) {
    markdown = content.endsWith("\n") ? content : content + "\n";
  } else {
    const data = {};
    if (title) data.title = title;
    if (excerpt) data.excerpt = excerpt;
    if (cover) data.cover = cover;
    data.date = date || new Date().toISOString();
    markdown = matter.stringify("", data) + "\n";
  }

  const path = `content/posts/${slug}.md`;

  try {
    const base64 = Buffer.from(markdown, "utf8").toString("base64");
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
