import { NextResponse } from "next/server";
import { getAllEpisodes } from "@/lib/episodes";

export async function GET() {
  const eps = await getAllEpisodes();
  const index = eps.map((e: any) => ({
    slug: e.slug,
    title: e.title,
    guests: (e.guests || []).map((g: any) => g.name),
    tags: e.tags || [],
    publishedAt: e.date,
  }));
  return NextResponse.json(index, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}