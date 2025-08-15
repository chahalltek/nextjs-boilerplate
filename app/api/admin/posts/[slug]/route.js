// app/api/admin/posts/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function frontMatter(obj) {
  const kv = Object.entries(obj)
    .filter(([, v]) => v != null && v !== "");
  const lines = kv.map(([k, v]) =>
    `${k}: ${typeof v === "string" ? `"${v.replace(/"/g, '\\"')}"` : v}`
  );
  return `---\n${lines.join("\n")}\n---\n`;
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, excerpt, content, date } = body || {};
  if (!title || !content) {
    return NextResponse.json({ ok: false, error: "Missing title/content" }, { status: 400 });
  }

  const md = `${frontMatter({ title, excerpt, date })}\n${content}\n`;
  const base64 = Buffer.from(md, "utf8").toString("base64");

  try {
    const filePath = `content/blog/${slug}.md`;
    const gh = await commitFile({
      path: filePath,
      contentBase64: base64,
      message: `post: ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
