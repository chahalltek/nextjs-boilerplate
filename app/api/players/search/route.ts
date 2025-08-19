// app/api/players/search/route.ts
import { NextResponse } from "next/server";
import { searchPlayers } from "@/lib/players/search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Number(searchParams.get("limit") || "12");
  const hits = q ? await searchPlayers(q, limit) : [];
  return NextResponse.json({ hits });
}
