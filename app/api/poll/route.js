// app/api/poll/route.js
import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const POLLS_DIR = "data/polls";

/**
 * GET /api/poll
 *  - /api/poll?slug=<slug> -> return that poll (+ empty results scaffold)
 *  - /api/poll             -> return list of all *active* polls (lightweight fields)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    if (slug) {
      // Return a single poll by slug
      const file = await getFile(`${POLLS_DIR}/${slug}.json`);
      if (!file) {
        return NextResponse.json(
          { ok: false, error: "Poll not found" },
          { status: 404 },
        );
      }

      const json = Buffer.from(file.contentBase64, "base64").toString("utf8");
      const poll = JSON.parse(json);

      // Results are kept separately (not implemented here yet), so return zeros.
      const results = {
        counts: Array.isArray(poll.options)
          ? new Array(poll.options.length).fill(0)
          : [],
        total: 0,
      };

      return NextResponse.json({ ok: true, poll, results });
    }

    // Otherwise: list all *active* polls
    const entries = await listDir(POLLS_DIR); // [{name, path, type, ...}]
    const files = entries.filter(
      (e) => e.type === "file" && e.name.endsWith(".json"),
    );

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

    // Sort newest first (by updatedAt if present)
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
