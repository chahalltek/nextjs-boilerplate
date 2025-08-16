// app/api/polls/route.js
import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// small helper
const b64ToJson = (b64) => {
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
};

export async function GET() {
  try {
    // If the folder doesn't exist yet, return empty list instead of 500
    let entries = [];
    try {
      entries = await listDir("data/polls");
    } catch {
      return NextResponse.json({ ok: true, polls: [] });
    }

    const polls = [];
    for (const e of entries) {
      if (e.type !== "file" || !e.name.endsWith(".json")) continue;
      const file = await getFile(e.path);
      if (!file?.contentBase64) continue;

      const json = b64ToJson(file.contentBase64);
      if (!json || !json.slug || !json.question || !Array.isArray(json.options)) {
        // skip malformed files instead of failing the whole request
        continue;
      }

      polls.push({
        slug: json.slug,
        question: json.question,
        options: json.options,
        active: !!json.active,                // allow multiple active polls
        closesAt: json.closesAt || null,
        createdAt: json.createdAt || null,
        updatedAt: json.updatedAt || json.createdAt || null,
      });
    }

    // newest first
    polls.sort((a, b) => {
      const ad = a.updatedAt || a.createdAt || "1970-01-01";
      const bd = b.updatedAt || b.createdAt || "1970-01-01";
      return new Date(bd) - new Date(ad);
    });

    return NextResponse.json({ ok: true, polls });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
