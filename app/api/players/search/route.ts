import { NextResponse } from "next/server";
import { searchPlayers } from "@/lib/players/search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const data = await searchPlayers(q, 12);
  return NextResponse.json({ results: data });
}
