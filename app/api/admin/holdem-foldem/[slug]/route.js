// app/api/admin/holdem-foldem/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, deleteFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/holdfold";

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug || "";
  const body = await request.json().catch(() => ({}));
  const { title, date, content } = body || {};

  if (!slug || !title || !content) {
    return NextResponse.json({ ok: false, error: "Missing slug, title, or content" }, { status: 400 });
  }

  const fm = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    ...(date ? [`date: ${date}`] : []),
    "---",
    "",
  ].join("\n");

  const md = `${fm}${content.endsWith("\n") ? content : content + "\n"}`;
  const base64 = Buffer.from(md, "utf8").toString("base64");
  const path = `${DIR}/${slug}.md`;

  try {
    const write = await commitFile({
      path,
      contentBase64: base64,
      message: `holdem-foldem: ${slug}`,
    });
    return NextResponse.json({ ok: true, commit: write.commit, path });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug || "";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  const path = `${DIR}/${slug}.md`;
  try {
    const res = await deleteFile({ path, message: `holdem-foldem: delete ${slug}` });
    return NextResponse.json({ ok: true, commit: res.commit, path });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
