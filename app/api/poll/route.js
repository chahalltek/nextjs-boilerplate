// app/api/poll/route.js
import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const POLLS_DIR = "data/polls";
const RESULTS_DIR = "data/poll-results";

async function readResults(slug, optionCount) {
  const f = await getFile(`${RESULTS_DIR}/${slug}.json`);
  if (!f) {
    return { counts: new Array(optionCount).fill(0), total: 0 };
  }
  const json = Buffer.from(f.contentBase64, "base64").toString("utf8");
  const r = JSON.parse(json);
  // Guard length differences if options changed
  const counts = Array.isArray(r.counts) ? r.counts.slice(0, optionCount) : [];
  while (counts.length < optionCount) counts.push(0);
  const total = counts.reduce((a, b) => a + (Number(b) || 0), 0);
  return { counts, total };
}

/**
 * GET /api/poll
 *   /api/poll?slug=<slug> -> single poll + results
 *   /api/poll             -> list of *active* polls (for the left column)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    if (slug) {
      const file = await getFile(`${POLLS_DIR}/${slug}.json`);
      if (!file) {
        return NextResponse.json(
          { ok: false, error: "Poll not found" },
          { status: 404 },
        );
      }
      const json = Buffer.from(file.contentBase64, "base64").toString("utf8");
      const poll = JSON.parse(json);

      const results = await readResults(slug, poll.options?.length || 0);
      return NextResponse.json({ ok: true, poll, results });
    }

    const entries = await listDir(POLLS_DIR);
    const files = entries.filter((e) => e.type === "file" && e.name.endsWith(".json"));

    const items = [];
    for (const f of files) {
      const file = await getFile(f.path);
      if (!file) continue;
      const json = Buffer.from(file.contentBase64, "base64").toString("utf8");
      const poll = JSON.parse(json);
      if (!poll?.active) continue;
      items.push({
        slug: poll.slug,
        question: poll.question,
        active: !!poll.active,
        updatedAt: poll.updatedAt || poll.createdAt || null,
      });
    }

    items.sort((a, b) => {
      const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return tb - ta;
    });

    return NextResponse.json({ ok: true, polls: items });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
