// app/api/admin/polls/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listDir, getFile, commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLLS_DIR = "data/polls";
const ACTIVE_PTR = "data/active-poll.json";

function b64(s) { return Buffer.from(s, "utf8").toString("base64"); }

export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    // list *.json in data/polls
    const items = (await listDir(POLLS_DIR))
      .filter(x => x.type === "file" && x.name.endsWith(".json"));

    const polls = await Promise.all(items.map(async (it) => {
      const f = await getFile(it.path);
      if (!f) return null;
      try {
        const json = JSON.parse(Buffer.from(f.contentBase64, "base64").toString("utf8"));
        return { slug: it.name.replace(/\.json$/, ""), question: json.question, active: !!json.active };
      } catch { return null; }
    }));

    return NextResponse.json({ ok: true, polls: polls.filter(Boolean) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

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
    const json = JSON.stringify(poll, null, 2);
    const filePath = `${POLLS_DIR}/${slug}.json`;

    const gh = await commitFile({
      path: filePath,
      contentBase64: b64(json),
      message: `poll: ${slug}`,
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
