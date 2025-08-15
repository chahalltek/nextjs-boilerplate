// app/api/polls/active/route.js
import { NextResponse } from "next/server";
import { getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ptr = await getFile("data/active-poll.json");
    if (!ptr) return NextResponse.json({ ok: true, active: null });
    const { slug } = JSON.parse(Buffer.from(ptr.contentBase64, "base64").toString("utf8")) || {};
    if (!slug) return NextResponse.json({ ok: true, active: null });

    const pollFile = await getFile(`data/polls/${slug}.json`);
    if (!pollFile) return NextResponse.json({ ok: true, active: null });

    const poll = JSON.parse(Buffer.from(pollFile.contentBase64, "base64").toString("utf8"));
    // results (counts)
    const resFile = await getFile(`data/poll-results/${slug}.json`);
    let results = null;
    if (resFile) {
      results = JSON.parse(Buffer.from(resFile.contentBase64, "base64").toString("utf8"));
    } else {
      results = { counts: new Array(poll.options.length).fill(0), total: 0 };
    }

    return NextResponse.json({ ok: true, active: { poll, results } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
