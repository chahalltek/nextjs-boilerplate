// app/api/survivor/entry/route.ts
import { NextResponse } from "next/server";
import { getSeason, upsertEntry } from "@/lib/survivor/store";

export async function POST(req: Request) {
  try {
    const { seasonId, name, picks, entryId } = await req.json();
    if (!seasonId || !picks?.bootOrder?.length || !picks?.final3?.length) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    const season = await getSeason(seasonId);
    if (!season) return NextResponse.json({ error: "season not found" }, { status: 404 });

    const entry = await upsertEntry(season, { id: entryId, name, picks });
    return NextResponse.json({ ok: true, entryId: entry.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
