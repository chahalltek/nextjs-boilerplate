import { NextResponse } from "next/server";
import { getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readJson(path) {
  const f = await getFile(path);
  if (!f) return null;
  const text = Buffer.from(f.contentBase64, "base64").toString("utf8");
  return JSON.parse(text);
}

export async function GET(_req, { params }) {
  const { slug } = params || {};
  if (!slug) return NextResponse.json({ ok:false, error:"Missing slug" }, { status:400 });

  try {
    const poll = await readJson(`data/polls/${slug}.json`);
    if (!poll) {
      return NextResponse.json({ ok:false, error:`Poll "${slug}" not found` }, { status:404 });
    }

    const results = (await readJson(`data/results/${slug}.json`)) ||
      { counts: Array(poll.options.length).fill(0), total: 0 };

    return NextResponse.json(
      { ok:true, active: { poll, results } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500, headers:{ "Cache-Control":"no-store" }});
  }
}
