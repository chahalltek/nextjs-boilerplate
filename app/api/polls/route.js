// app/api/polls/route.js
import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readJSON(path) {
  const f = await getFile(path);
  if (!f) return null;
  const json = Buffer.from(f.contentBase64, "base64").toString("utf8");
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // All poll files live here, written by the admin routes
    const dir = await listDir("data/polls"); // [{name, path, type}, ...] or []
    const files = (dir || []).filter(
      (it) => it?.type === "file" && typeof it?.name === "string" && it.name.endsWith(".json")
    );

    const polls = [];
    for (const it of files) {
      const p = await readJSON(it.path || `data/polls/${it.name}`);
      if (p?.slug && Array.isArray(p?.options)) {
        polls.push(p);
      }
    }

    // Current active poll pointer (if present)
    const activePtr = await readJSON("data/active-poll.json");
    const activeSlug =
      activePtr?.slug || polls.find((p) => p.active)?.slug || null;

    // Sort newest first if updatedAt exists, otherwise by slug
    polls.sort((a, b) => {
      const da = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const db = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      if (db !== da) return db - da;
      return String(a.slug).localeCompare(String(b.slug));
    });

    return NextResponse.json({ ok: true, polls, activeSlug });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}