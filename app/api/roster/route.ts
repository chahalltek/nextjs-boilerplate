// app/api/roster/route.ts
import { NextResponse } from "next/server";
import { createRoster, saveRoster, getRoster } from "@/lib/roster/store";
import { mergeRosterMeta } from "@/lib/roster/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const roster = await getRoster(id);
  if (!roster) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ roster });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { id, email, name, players, pins, rules, scoring, optInEmail } = body || {};

  // Normalize/validate players; allow undefined
  const list: string[] | undefined = Array.isArray(players)
    ? (players as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  let roster;

  if (id) {
    // Update path: build a safe patch with only defined/known keys
    const patch: Record<string, any> = {};
    if (typeof name === "string") patch.name = name;
    if (list) patch.players = list;
    if (isObject(pins)) patch.pins = pins;
    if (isObject(rules)) patch.rules = rules;
    if (typeof scoring === "string") patch.scoring = scoring;
    if (typeof optInEmail === "boolean") patch.optInEmail = optInEmail;

    roster = await saveRoster(id, patch);
  } else {
    // Create path: email is required and must be a string
    const emailStr =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!emailStr) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    roster = await createRoster({
      email: emailStr,
      name: typeof name === "string" ? name : undefined,
      rules: isObject(rules) ? (rules as any) : undefined,
      players: list,
    });

    if (body.meta && roster?.id) {
  await mergeRosterMeta(roster.id, body.meta);

    // Persist optional flags after create
    const postCreatePatch: Record<string, any> = {};
    if (typeof scoring === "string") postCreatePatch.scoring = scoring;
    if (typeof optInEmail === "boolean") postCreatePatch.optInEmail = optInEmail;
    if (isObject(pins)) postCreatePatch.pins = pins;
    if (Object.keys(postCreatePatch).length) {
      roster = await saveRoster(roster.id, postCreatePatch);
    }
  }

  // Learn/merge positions for supplied players to help lineup computation
  if (list && list.length) {
    const posMap = await fetchPositions(list);
    if (Object.keys(posMap).length) {
      const existing = (roster as any)._pos || {};
      const merged = { ...existing, ...posMap };
      roster = await saveRoster(roster.id, { _pos: merged } as any);
    }
  }

  return NextResponse.json({ roster });
}

/* utils */

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// Pulls the Sleeper map once and returns positions for requested IDs
async function fetchPositions(ids: string[]): Promise<Record<string, string>> {
  try {
    const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
      cache: "force-cache",
    });
    const data = await res.json();
    const out: Record<string, string> = {};
    for (const id of ids) {
      const p = data?.[id];
      const pos = typeof p?.position === "string" ? p.position : undefined;
      if (pos) out[id] = pos;
    }
    return out;
  } catch {
    return {};
  }
}
