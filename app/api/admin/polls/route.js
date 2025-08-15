// app/api/admin/polls/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const { slug, question, options, active, closesAt } = body || {};
  if (!slug || !question || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const poll = {
    slug,
    question,
    options,
    active: !!active,
    closesAt: closesAt || null,
    createdAt: new Date().toISOString(),
  };

  try {
    // Save poll JSON
    const json = JSON.stringify(poll, null, 2);
    const base64 = Buffer.from(json, "utf8").toString("base64");
    const filePath = `data/polls/${slug}.json`;
    const gh = await commitFile({
      path: filePath,
      contentBase64: base64,
      message: `poll: ${slug}`,
      sha: undefined, // TS friendly
    });

    // If marked active, write a small pointer file
    if (poll.active) {
      const ptr = JSON.stringify({ slug }, null, 2);
      await commitFile({
        path: "data/active-poll.json",
        contentBase64: Buffer.from(ptr, "utf8").toString("base64"),
        message: `activate poll: ${slug}`,
        sha: undefined, // TS friendly
      });
    }

    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
