import { NextResponse } from "next/server";
import { appendBoot, recomputeLeaderboard } from "@/lib/survivor/store";

export async function POST(req: Request) {
  const { seasonId, bootId } = await req.json();

  if (!seasonId || !bootId) {
    return NextResponse.json({ error: "seasonId and bootId required" }, { status: 400 });
  }

  await appendBoot(seasonId, bootId);
  const updatedCount = await recomputeLeaderboard(seasonId); // number of entries rescored

  return NextResponse.json({ ok: true, updated: updatedCount });
}
