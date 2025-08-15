// app/api/polls/[slug]/vote/route.js
import { NextResponse } from "next/server";
import { getFile, commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const slug = params.slug;
    const body = await request.json().catch(() => ({}));
    const index = Number(body.index);
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ ok: false, error: "bad index" }, { status: 400 });
    }

    // read poll
    const pollFile = await getFile(`data/polls/${slug}.json`);
    if (!pollFile) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const poll = JSON.parse(Buffer.from(pollFile.contentBase64, "base64").toString("utf8"));
    if (index >= poll.options.length) {
      return NextResponse.json({ ok: false, error: "bad index" }, { status: 400 });
    }

    // read results (or init)
    const resFile = await getFile(`data/poll-results/${slug}.json`);
    let counts = new Array(poll.options.length).fill(0);
    let total = 0;
    if (resFile) {
      const r = JSON.parse(Buffer.from(resFile.contentBase64, "base64").toString("utf8"));
      if (Array.isArray(r.counts)) counts = r.counts.slice(0, poll.options.length);
      if (typeof r.total === "number") total = r.total;
    }

    counts[index] += 1;
    total += 1;

    const out = { counts, total };
    const base64 = Buffer.from(JSON.stringify(out, null, 2), "utf8").toString("base64");
    const gh = await commitFile({
      path: `data/poll-results/${slug}.json`,
      contentBase64: base64,
      message: `vote: ${slug}`,
    });

    return NextResponse.json({ ok: true, results: out, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
