// app/api/survivor/entry/route.ts
import { NextResponse } from "next/server";
// TODO: plug in your store (KV/Supabase/GitHub)

export async function POST(req: Request) {
  const body = await req.json();
  // validate body.seasonId, picks.bootOrder etc.
  // await saveEntry(body);
  return NextResponse.json({ ok: true }, { status: 200 });
}
