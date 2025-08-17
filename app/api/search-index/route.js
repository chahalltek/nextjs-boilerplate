// app/api/search-index/route.js
import { NextResponse } from "next/server";
import { getAllContentIndex } from "@/lib/contentIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const index = await getAllContentIndex();
    // Keep payload small: don’t ship rawContent, only searchable fields
    const lite = index.map(({ rawContent, ...rest }) => rest);

    const res = NextResponse.json({ ok: true, index: lite });
    // cache at the edge for 5 min; browsers can revalidate quickly
    res.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
