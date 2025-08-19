// app/api/roster/route.ts
import { NextResponse } from "next/server";
import { createRoster, saveRoster, getRoster } from "@/lib/roster/store";

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

  // Validate/normalize players; allow undefined
  const list: string[] | undefined = Array.isArray(players)
    ? (players as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  // Create or update
  let roster =
    id
      ? await saveRoster(id, cleanPatch({ name, players: list, pins, rules, scoring, optInEmail }))
      : await createRoster(cleanPatch({ email, name, players: list, rules }));

  // If created, also persist scoring/opt-in if provided
  if (!id && (scoring !== undefined || optInEmail !== undefined)) {
    roster = await saveRoster(roster.id, cleanPatch({ scoring, optInEmail }) as any);
  }

  // Learn/merge positions for supplied players (helps lineup compute)
  if (list && list.length > 0) {
    const pos = await fetchPositions(list);
    if (Object.keys(pos).length) {
      const existing = (roster as any)._pos || {};
      const merged = { ...existing, ...pos };
      roster = await saveRoster(roster.id, { _pos: merged } as any);
    }
  }

  return NextResponse.json({ roster });
}

function cleanPatch(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (k === "email" && typeof v === "string") out.email = v.trim().toLowerCase();
    else out[k] = v;
  }
  return out;
}

// Pulls the Sleeper map once and returns positions for requested IDs
async function fetchPositions(ids: string[]): Promise<Record<string, string>> {
  try {
    const res = await fetch("https://api.sleeper.app/v1/players/nfl", { cache: "force-cache" });
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
