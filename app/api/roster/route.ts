import { NextResponse } from "next/server";
import { createRoster, getRoster, saveRoster } from "@/lib/roster/store";
import type { RosterRules, UserRoster } from "@/lib/roster/types";

export const runtime = "nodejs";

/** GET /api/roster?id=... -> { roster } */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const roster = await getRoster(id);
  return NextResponse.json({ roster });
}

/** POST /api/roster { id? | email, name?, players?, pins?, rules?, scoring?, optInEmail? } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { id, email, name, players, pins, rules, scoring, optInEmail } = body || {};

    // Validate/normalize players list
    const list: string[] | undefined = Array.isArray(players)
      ? (players as any[]).map(String).filter(Boolean)
      : undefined;

    // Validate/normalize pins (currently only FLEX)
    const pinsClean =
      pins && typeof pins === "object"
        ? {
            FLEX: Array.isArray(pins.FLEX)
              ? (pins.FLEX as any[]).map(String).filter(Boolean)
              : undefined,
          }
        : undefined;

    if (id) {
      // Update existing roster
      const current = await getRoster(id);
      if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

      // Build a FULL rules object if caller provided partial rules
      const nextRules: RosterRules | undefined = rules
        ? {
            QB: numOr(current.rules.QB, rules.QB, 1),
            RB: numOr(current.rules.RB, rules.RB, 2),
            WR: numOr(current.rules.WR, rules.WR, 2),
            TE: numOr(current.rules.TE, rules.TE, 1),
            FLEX: numOr(current.rules.FLEX, rules.FLEX, 1),
            DST: numOr(current.rules.DST, rules.DST, 1),
            K: numOr(current.rules.K, rules.K, 1),
          }
        : undefined;

      const patch: Partial<UserRoster> = stripUndef({
        name,
        players: list,
        pins: pinsClean,
        rules: nextRules,
        scoring,
        optInEmail,
      });

      const roster = await saveRoster(id, patch);
      return NextResponse.json({ roster });
    }

    // Create new roster
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // For create, if rules are supplied, make them full; otherwise store.ts will default them.
    const createRules: RosterRules | undefined = rules
      ? {
          QB: numOr(undefined, rules.QB, 1),
          RB: numOr(undefined, rules.RB, 2),
          WR: numOr(undefined, rules.WR, 2),
          TE: numOr(undefined, rules.TE, 1),
          FLEX: numOr(undefined, rules.FLEX, 1),
          DST: numOr(undefined, rules.DST, 1),
          K: numOr(undefined, rules.K, 1),
        }
      : undefined;

    const created = await createRoster(
      stripUndef({
        email: String(email),
        name,
        players: list,
        rules: createRules,
      }) as {
        email: string;
        name?: string;
        players?: string[];
        rules?: Partial<RosterRules>;
      }
    );

    // Patch extra fields not handled at create (pins/scoring/opt-in)
    if (pinsClean || scoring !== undefined || optInEmail !== undefined) {
      await saveRoster(created.id, stripUndef({ pins: pinsClean, scoring, optInEmail }));
    }

    const roster = await getRoster(created.id);
    return NextResponse.json({ roster: roster ?? created });
  } catch (e) {
    console.error("POST /api/roster error", e);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}

/* ---------- helpers ---------- */

function stripUndef<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/** prefer explicit newVal; else keep current; else fallback */
function numOr(current: number | undefined, newVal: unknown, fallback: number): number {
  const n = Number(newVal);
  if (!Number.isNaN(n)) return n;
  if (typeof current === "number") return current;
  return fallback;
}
