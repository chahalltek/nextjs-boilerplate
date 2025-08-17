// app/cws/rss.xml/route.js
import { NextResponse } from "next/server";
import { getRecaps } from "@/lib/contentIndex";
import { buildRss } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getRecaps();
  const xml = buildRss({ title: "Hey Skol Sister — Weekly Recaps", items });
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
