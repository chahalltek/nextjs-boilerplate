// app/api/admin/posts/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create a new post at content/posts/<slug>.md
export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  let body = {};
  try { body = await request.json(); } catch {}
  const { slug, title, excerpt = "", content = "", date } = body || {};

  if (!slug || !title || !content) {
    return NextResponse.json(
      { ok: false, error: "Missing slug, title, or content" },
      { status: 400 }
    );
  }

  const safeSlug = String(slug)
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "-")
    .replace(/--+/g, "-");

  // Simple frontmatter + markdown
  const fmLines = [
    "---",
    `title: ${JSON.stringify(title)}`,
    ...(excerpt ? [`excerpt: ${JSON.stringify(excerpt)}`] : []),
    ...(date ? [`date: ${JSON.stringify(date)}`] : []),
    "---",
    "",
  ];
  const md = fmLines.join("\n") + String(content);

  try {
    const base64 = Buffer.from(md, "utf8").toString("base64");
    const filePath = `content/posts/${safeSlug}.md`;
    const gh = await commitFile({
      path: filePath,
      contentBase64: base64,
      message: `post: ${safeSlug}`,
      sha: undefined, // TS friendly
    });
    return NextResponse.json({ ok: true, commit: gh.commit, path: filePath });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
