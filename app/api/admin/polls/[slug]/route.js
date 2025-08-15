// app/api/admin/polls/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, deleteFile, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLLS_DIR = "data/polls";

export async function GET(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = (params?.slug || "").toString().trim();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  try {
    const got = await getFile(`${POLLS_DIR}/${slug}.json`);
    return NextResponse.json({ ok: true, exists: !!got });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = (params?.slug || "").toString().trim();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({}));
    const json = JSON.stringify(body || {}, null, 2);
    const base64 = Buffer.from(json, "utf8").toString("base64");

    const write = await commitFile({
      path: `${POLLS_DIR}/${slug}.json`,
      contentBase64: base64,
      message: `poll: ${slug}`,
      sha: undefined,
    });
    return NextResponse.json({ ok: true, commit: write.commit });
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
    const del = await deleteFile({ path: `${POLLS_DIR}/${slug}.json`, message: `delete poll: ${slug}` });
    return NextResponse.json({ ok: true, commit: del.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
