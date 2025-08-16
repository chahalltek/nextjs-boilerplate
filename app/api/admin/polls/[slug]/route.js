// app/api/admin/polls/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, commitFile, deleteFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLLS_DIR = "data/polls";
const ACTIVE_PTR = "data/active-poll.json";
const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const fromB64 = (s) => Buffer.from(s, "base64").toString("utf8");

export async function GET(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  try {
    const f = await getFile(`${POLLS_DIR}/${slug}.json`);
    if (!f) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const poll = JSON.parse(fromB64(f.contentBase64));
    return NextResponse.json({ ok: true, poll });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  const body = await request.json().catch(() => ({}));
  const { question, options, active, closesAt } = body || {};
  if (!question || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const poll = {
    slug,
    question,
    options,
    active: !!active,
    closesAt: closesAt || null,
    updatedAt: new Date().toISOString(),
  };

  try {
    const gh = await commitFile({
      path: `${POLLS_DIR}/${slug}.json`,
      contentBase64: b64(JSON.stringify(poll, null, 2)),
      message: `poll: update ${slug}`,
    });

    if (poll.active) {
      await commitFile({
        path: ACTIVE_PTR,
        contentBase64: b64(JSON.stringify({ slug }, null, 2)),
        message: `activate poll: ${slug}`,
      });
    }
    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  try {
    await deleteFile({ path: `${POLLS_DIR}/${slug}.json`, message: `poll: delete ${slug}` });

    // If it was active, clear the pointer
    await commitFile({
      path: ACTIVE_PTR,
      contentBase64: b64(JSON.stringify({ slug: "" }, null, 2)),
      message: `deactivate poll: ${slug}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
