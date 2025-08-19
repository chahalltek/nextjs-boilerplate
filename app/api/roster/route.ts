import { NextResponse } from "next/server";
import { createRoster, getRoster, saveRoster } from "@/lib/roster/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const roster = await getRoster(id);
  return NextResponse.json({ roster });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  // create
  if (!body.id) {
    if (!body.email) return NextResponse.json({ error: "email required" }, { status: 400 });
    const roster = await createRoster({
      email: body.email,
      name: body.name,
      rules: body.rules,
      players: body.players || [],
    });
    return NextResponse.json({ roster });
  }

  // update
  const roster = await saveRoster(body.id, {
    name: body.name,
    rules: body.rules,
    players: body.players,
  });
  return NextResponse.json({ roster });
}
