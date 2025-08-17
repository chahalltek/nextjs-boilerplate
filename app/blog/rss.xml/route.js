// app/blog/rss.xml/route.js
import { NextResponse } from "next/server";
import { getPosts } from "@/lib/contentIndex";
import { buildRss } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getPosts();
  const xml = buildRss({ title: "Hey Skol Sister — Blog", items });
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
