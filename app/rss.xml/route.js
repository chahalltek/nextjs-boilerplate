// app/rss.xml/route.js
import { NextResponse } from "next/server";
import { getPosts, getRecaps, getHoldem } from "@/lib/contentIndex";
import { buildRss } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [posts, recaps, holdem] = await Promise.all([
    getPosts(), getRecaps(), getHoldem()
  ]);
  const items = [...posts, ...recaps, ...holdem];
  const xml = buildRss({ title: "Hey Skol Sister — All Updates", items });

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
