// app/api/poll/vote/route.js
import { NextResponse } from "next/server";
import { getFile, commitFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const POLLS_DIR = "data/polls";
const RESULTS_DIR = "data/poll-results";

function cookieName(slug) {
  return `sv_voted_${slug}`;
}

async function loadPoll(slug) {
  const f = await getFile(`${POLLS_DIR}/${slug}.json`);
  if (!f) return null;
  const json = Buffer.from(f.contentBase64, "base64").toString("utf8");
  return JSON.parse(json);
}

async function loadResults(slug, optionCount) {
  const f = await getFile(`${RESULTS_DIR}/${slug}.json`);
  if (!f) {
    return { counts: new Array(optionCount).fill(0), total: 0 };
  }
  const json = Buffer.from(f.contentBase64, "base64").toString("utf8");
  const r = JSON.parse(json);
  const counts = Array.isArray(r.counts) ? r.counts.slice(0, optionCount) : [];
  while (counts.length < optionCount) counts.push(0);
  const total = counts.reduce((a, b) => a + (Number(b) || 0), 0);
  return { counts, total };
}

export async function POST(request) {
  try {
    const { slug, choice } = await request.json().catch(() => ({}));
    if (!slug || typeof choice !== "number" || choice < 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    // Simple cookie-based protection (no account required)
    const cookieHeader = request.headers.get("cookie") || "";
    const already = cookieHeader.split(/;\s*/).some((c) => c.startsWith(`${cookieName(slug)}=`));
    if (already) {
      return NextResponse.json(
        { ok: false, error: "You already voted on this poll." },
        { status: 409 },
      );
    }

    const poll = await loadPoll(slug);
    if (!poll) {
      return NextResponse.json(
        { ok: false, error: "Poll not found" },
        { status: 404 },
      );
    }
    const optionCount = Array.isArray(poll.options) ? poll.options.length : 0;
    if (choice >= optionCount) {
      return NextResponse.json(
        { ok: false, error: "Invalid choice" },
        { status: 400 },
      );
    }

    // Load, mutate, persist results in the repo
    let results = await loadResults(slug, optionCount);
    results.counts[choice] = (Number(results.counts[choice]) || 0) + 1;
    results.total = (Number(results.total) || 0) + 1;

    const body = Buffer.from(JSON.stringify(results, null, 2), "utf8").toString("base64");

    // naive retry on 409 race from concurrent commits
    let commitSha = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const gh = await commitFile({
          path: `${RESULTS_DIR}/${slug}.json`,
          contentBase64: body,
          message: `vote: ${slug}`,
        });
        commitSha = gh.commit || null;
        break;
      } catch (e) {
        const msg = String(e?.message || e);
        if (!/put failed 409/i.test(msg) || attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 120 + Math.random() * 240));
        // reload & reapply before retry
        results = await loadResults(slug, optionCount);
        results.counts[choice] = (Number(results.counts[choice]) || 0) + 1;
        results.total = (Number(results.total) || 0) + 1;
      }
    }

    const res = NextResponse.json({ ok: true, results, commit: commitSha });
    // 1-year cookie marking that this browser voted in this poll
    res.headers.append(
      "Set-Cookie",
      `${cookieName(slug)}=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure`,
    );
    return res;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
