// app/api/nfl/week/route.ts
import { NextResponse } from "next/server";
import { fetchNflWeek } from "@/lib/nfl/week";

export const runtime = "nodejs";

export async function GET() {
  const info = await fetchNflWeek();
  return NextResponse.json(info, { headers: { "Cache-Control": "public, max-age=300" } });
}
