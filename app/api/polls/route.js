// app/api/polls/route.js
import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const b64ToJson = (b64) => {
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
};

export async function GET(request) {
  const url = new URL(request.url);
  const onlyActive = url.searchParams.get("active");

  try {
    let entries = [];
    try {
      entries = await listDir("data/polls");
    } catch {
      // no folder yet
      return NextResponse.json({ ok: true, polls: [] });
    }

    const polls = [];
    for (const e of entries) {
      if (e.type !== "file" || !e.name.endsWith(".json")) continue;

      const file = await getFile(e.path);
      if (!file?.contentBase64) continue;

      const data = b64ToJson(file.contentBase64);
      if (!data || !data.slug || !data.question || !Array.isArray(data.options))
        continue;

      polls.push({
        slug: data.slug,
        question: data.question,
        options: data.options,
        active: !!data.active,
        closesAt: data.closesAt || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || data.createdAt || null,
      });
    }

    // newest first
    polls.sort((a, b) => {
      const ad = a.updatedAt || a.createdAt || "1970-01-01";
      const bd = b.updatedAt || b.createdAt || "1970-01-01";
      return new Date(bd) - new Date(ad);
    });

    const filtered = onlyActive ? polls.filter((p) => p.active) : polls;
    return NextResponse.json({ ok: true, polls: filtered });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
