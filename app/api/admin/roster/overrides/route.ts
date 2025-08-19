import { NextResponse } from "next/server";
import { getOverrides, setOverrides } from "@/lib/roster/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const week = Number(new URL(req.url).searchParams.get("week") || "1");
  const o = await getOverrides(week);
  return NextResponse.json({ overrides: o });
}

export async function POST(req: Request) {
  const body = await req.json();
  const week = Number(body.week);
  if (!week) return NextResponse.json({ error: "week required" }, { status: 400 });
  const o = await setOverrides(week, {
    week,
    pointDelta: body.pointDelta || {},
    forceStart: body.forceStart || {},
    forceSit: body.forceSit || {},
    note: body.note,
  });
  return NextResponse.json({ overrides: o });
}
