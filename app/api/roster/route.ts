import { NextResponse } from "next/server";
import { createRoster, getRoster, saveRoster } from "@/lib/roster/store";
import type { RosterRules, ScoringProfile } from "@/lib/roster/types";

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

  const patch: {
    id?: string;
    email?: string;
    name?: string;
    players?: string[];
    pins?: { FLEX?: string[] };
    rules?: Partial<RosterRules>;
    scoring?: ScoringProfile;
    optInEmail?: boolean;
  } = body || {};

  try {
    if (patch.id) {
      const roster = await saveRoster(patch.id, {
        name: patch.name,
        players: patch.players,
        pins: patch.pins,
        rules: patch.rules as Partial<RosterRules> | undefined,
        scoring: patch.scoring,
        optInEmail: typeof patch.optInEmail === "boolean" ? patch.optInEmail : undefined,
      });
      return NextResponse.json({ roster });
    }

    if (!patch.email) return NextResponse.json({ error: "email required" }, { status: 400 });
    const roster = await createRoster({
      email: patch.email,
      name: patch.name,
      players: patch.players,
      pins: patch.pins,
      rules: patch.rules as Partial<RosterRules> | undefined,
      scoring: (patch.scoring as ScoringProfile) || "PPR",
      optInEmail: typeof patch.optInEmail === "boolean" ? patch.optInEmail : true,
    });
    return NextResponse.json({ roster });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
