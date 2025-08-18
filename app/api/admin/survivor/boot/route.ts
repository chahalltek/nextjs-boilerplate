// app/api/admin/survivor/boot/route.ts
import { NextResponse } from "next/server";
import { appendBoot, recomputeLeaderboard } from "@/lib/survivor/store";

export async function POST(req: Request) {
  const { seasonId, bootId } = await req.json();
  if (!seasonId || !bootId) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  await appendBoot(seasonId, bootId);
  const scored = await recomputeLeaderboard(seasonId);
  return NextResponse.json({ ok: true, updated: scored.length });
}
