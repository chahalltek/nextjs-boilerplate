import { NextResponse } from "next/server";
import { getRoster, getLineup, saveLineup, getOverrides } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const week = Number(searchParams.get("week") || "1");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const roster = await getRoster(id);
  if (!roster) return NextResponse.json({ error: "roster not found" }, { status: 404 });

  const cached = await getLineup(id, week);
  if (cached) return NextResponse.json({ lineup: cached, cached: true });

  const overrides = await getOverrides(week);
  const lineup = await computeLineup(roster, week, overrides);
  await saveLineup(id, week, lineup);
  return NextResponse.json({ lineup, cached: false });
}
