// app/api/roster/route.ts
import { NextResponse } from "next/server";
import { createRoster, getRoster, saveRoster } from "@/lib/roster/store";
import { subscribeEmail } from "@/lib/newsletter/store";
import type { RosterRules, UserRoster, ScoringProfile } from "@/lib/roster/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const roster = await getRoster(id);
  if (!roster) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ roster });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, any>;
    const {
      id,
      email,
      name,
      players,
      pins,
      rules,
      scoring,
      optInEmail,
    }: {
      id?: string;
      email?: string;
      name?: string;
      players?: string[];
      pins?: { FLEX?: string[] };
      rules?: Partial<RosterRules>;
      scoring?: ScoringProfile;
      optInEmail?: boolean;
    } = body || {};

    // Validate players -> string[]
    const list: string[] | undefined = Array.isArray(players)
      ? players.map((s) => String(s).trim()).filter(Boolean)
      : undefined;

    // Clean pins
    const pinsClean: { FLEX?: string[] } | undefined = pins?.FLEX
      ? { FLEX: pins.FLEX.map((s) => String(s).trim()).filter(Boolean) }
      : undefined;

    // Normalize rules -> full RosterRules when present
    const rulesNorm: RosterRules | undefined = normalizeRules(rules);

    let roster: UserRoster;

    if (id) {
      // UPDATE
      roster = await saveRoster(
        id,
        stripUndef({
          name,
          players: list,
          pins: pinsClean,
          rules: rulesNorm,          // Full object, not partial
          scoring,
          optInEmail,
        })
      );

      // Auto-subscribe: prefer explicit email in payload, fall back to stored
      await subscribeEmail(email || roster.email);
    } else {
      // CREATE
      if (!email) {
        return NextResponse.json({ error: "email required to create roster" }, { status: 400 });
      }
      roster = await createRoster(
        stripUndef({
          email,
          name,
          players: list,
          rules: rulesNorm,
        }) as {
          email: string;
          name?: string;
          rules?: Partial<RosterRules>;
          players?: string[];
        }
      );

      // Persist optional flags on the freshly created roster
      if (scoring !== undefined || optInEmail !== undefined) {
        roster = await saveRoster(roster.id, stripUndef({ scoring, optInEmail }));
      }

      // Auto-subscribe on create
      await subscribeEmail(email);
    }

    return NextResponse.json({ roster });
  } catch (e) {
    console.error("roster POST error", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

/* ---------------- helpers ---------------- */

function stripUndef<T extends object>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

function normalizeRules(input?: Partial<RosterRules>): RosterRules | undefined {
  if (!input || typeof input !== "object") return undefined;
  const base: RosterRules = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1 };
  const out: RosterRules = { ...base };
  for (const key of Object.keys(base) as (keyof RosterRules)[]) {
    const n = Number((input as any)[key]);
    if (Number.isFinite(n) && n >= 0) out[key] = n;
  }
  return out;
}
