// app/api/admin/holdfold/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/holdfold";

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params || {};
  const body = await request.json().catch(() => ({}));
  const { title, date, content } = body || {};

  if (!slug || !title || !content) {
    return NextResponse.json({ ok: false, error: "Missing slug, title, or content" }, { status: 400 });
  }

  try {
    const filePath = `${DIR}/${slug}.md`;
    const base64 = Buffer.from(content, "utf8").toString("base64");
    const gh = await commitFile({
      path: filePath,
      contentBase64: base64,
      message: `holdfold: ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: gh.commit, path: gh.path });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
