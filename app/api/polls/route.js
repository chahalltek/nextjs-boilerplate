import { NextResponse } from "next/server";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readJson(path) {
  const f = await getFile(path);
  if (!f) return null;
  const text = Buffer.from(f.contentBase64, "base64").toString("utf8");
  return JSON.parse(text);
}

export async function GET() {
  try {
    const entries = await listDir("data/polls").catch(() => []);
    const slugs = entries
      .filter((e) => e.type === "file" && e.name.endsWith(".json"))
      .map((e) => e.name.replace(/\.json$/,""));

    const polls = [];
    for (const slug of slugs) {
      const p = await readJson(`data/polls/${slug}.json`).catch(() => null);
      if (p) {
        polls.push({
          slug: p.slug || slug,
          question: p.question,
          active: !!p.active,
          updatedAt: p.updatedAt || p.createdAt || null,
        });
      }
    }

    // active first, then newest
    polls.sort((a, b) =>
      (b.active - a.active) ||
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) ||
      a.slug.localeCompare(b.slug)
    );

    return NextResponse.json({ ok: true, polls }, { headers: { "Cache-Control": "no-store" }});
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500, headers:{ "Cache-Control":"no-store" }});
  }
}
