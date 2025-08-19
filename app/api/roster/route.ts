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
  const body = await req.json().catch(() => ({}));
  const { id, email, name, players, pins, rules, scoring, optInEmail } = body || {};

  // Validate player list (optional)
  const list: string[] = Array.isArray(players) ? players.filter(Boolean) : undefined;

  // Create or update
  let roster = id
    ? await saveRoster(id, cleanPatch({ name, players: list, pins, rules, scoring, optInEmail }))
    : await createRoster(cleanPatch({ email, name, players: list, rules }));

  // Merge known positions for any provided players
  if (list && list.length > 0) {
    const pos = await fetchPositions(list);
    // attach/merge `_pos` without forcing type changes downstream
    const existing = (roster as any)._pos || {};
    const merged = { ...existing, ...pos };
    roster = await saveRoster(roster.id, { ...(roster as any), _pos: merged } as any);
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

// Pulls the big Sleeper map once, returns positions for the requested IDs
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
    // fallback: nothing learned
    return {};
  }
}
