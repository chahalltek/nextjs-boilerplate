// app/api/roster/route.ts
import { NextResponse } from "next/server";
import { createRoster, saveRoster, getRoster } from "@/lib/roster/store";

export const runtime = "nodejs";

/* -------------------- Helpers -------------------- */

function normIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
    )
  );
}

function normPins(input: unknown): { FLEX?: string[] } | undefined {
  if (!input || typeof input !== "object") return undefined;
  const anyPins = input as any;
  const out: { FLEX?: string[] } = {};
  if (Array.isArray(anyPins.FLEX)) out.FLEX = normIds(anyPins.FLEX);
  return Object.keys(out).length ? out : undefined;
}

/* -------------------- POST -------------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id: string | undefined = typeof body.id === "string" ? body.id : undefined;
    const email: string | undefined =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
    const name: string | undefined = typeof body.name === "string" ? body.name.trim() : undefined;
    const players: string[] | undefined = normIds(body.players);
    const pins = normPins(body.pins);
    const optInEmail: boolean | undefined =
      typeof body.optInEmail === "boolean" ? body.optInEmail : undefined;

    // UPDATE
    if (id) {
      const patch: any = {};
      if (name !== undefined) patch.name = name;
      if (players && players.length) patch.players = players;
      if (pins) patch.pins = pins;
      if (optInEmail !== undefined) patch.optInEmail = optInEmail;

      const roster = await saveRoster(id, patch as any);
      return NextResponse.json({ ok: true, roster });
    }

    // CREATE
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // create the base roster
    const roster = await createRoster({
      email,
      name,
      players,
    });

    // then persist optional extras (works even if your store.ts
    // doesn't yet accept these on create)
    const final = await saveRoster(roster.id, {
      ...(pins ? { pins } : {}),
      ...(optInEmail !== undefined ? { optInEmail } : {}),
    } as any);

    return NextResponse.json({ ok: true, roster: final });
  } catch (e) {
    console.error("POST /api/roster error", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

/* -------------------- GET -------------------- */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const roster = await getRoster(id);
    if (!roster) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ roster });
  } catch (e) {
    console.error("GET /api/roster error", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
