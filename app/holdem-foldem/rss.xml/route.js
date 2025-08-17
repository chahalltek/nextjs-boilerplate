// app/holdem-foldem/rss.xml/route.js
import { NextResponse } from "next/server";
import { getHoldem } from "@/lib/contentIndex";
import { buildRss } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getHoldem();
  const xml = buildRss({ title: "Hey Skol Sister — Hold ’em / Fold ’em", items });
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
