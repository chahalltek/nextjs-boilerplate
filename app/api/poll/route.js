// app/api/poll/route.js
import { NextResponse } from "next/server";
import { getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readJsonFromGitHub(path) {
  const f = await getFile(path);
  if (!f) return null;
  const text = Buffer.from(f.contentBase64, "base64").toString("utf8");
  try { return JSON.parse(text); } catch { return null; }
}

export async function GET() {
  try {
    // pointer to active poll (write by admin)
    const pointer =
      (await readJsonFromGitHub("data/active-poll.json")) ||
      (await readJsonFromGitHub("content/polls/active-poll.json")) ||
      (await readJsonFromGitHub("content/active-poll.json"));

    if (!pointer?.slug) {
      return NextResponse.json({ ok: true, active: null }, { headers: { "Cache-Control": "no-store" } });
    }

    // poll definition
    const poll =
      (await readJsonFromGitHub(`data/polls/${pointer.slug}.json`)) ||
      (await readJsonFromGitHub(`content/polls/${pointer.slug}.json`));

    if (!poll) {
      return NextResponse.json(
        { ok: false, error: `Poll "${pointer.slug}" not found` },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // results (optional)
    const results =
      (await readJsonFromGitHub(`data/results/${pointer.slug}.json`)) ||
      { counts: Array(poll.options.length).fill(0), total: 0 };

    return NextResponse.json(
      { ok: true, active: { poll, results } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
