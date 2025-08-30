// app/api/roster/route.ts
import { NextResponse } from "next/server";
import { createRoster, getRoster, saveRoster } from "@/lib/roster/store";
import { subscribeEmail } from "@/lib/newsletter/store";
import type { RosterRules, UserRoster, ScoringProfile } from "@/lib/roster/types";

export const runtime = "nodejs";

/* ---------- GET: fetch a roster by id ---------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const roster = await getRoster(id);
  if (!roster) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, roster });
}

/* ---------- POST: create or update a roster ---------- */
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
      meta, // ignored server-side for now, but safe to receive
    }: {
      id?: string;
      email?: string;
      name?: string;
      players?: string[];
      pins?: { FLEX?: string[] };
      rules?: Partial<RosterRules>;
      scoring?: ScoringProfile;
      optInEmail?: boolean;
      meta?: Record<string, unknown>;
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
      // ---------- UPDATE ----------
      roster = await saveRoster(
        id,
        stripUndef({
          name,
          players: list,
          pins: pinsClean,
          rules: rulesNorm,
          scoring,
          optInEmail,
        })
      );

      // Try to (re)subscribe but never fail the request because of it
      if (email || roster.email) {
        try {
          await subscribeEmail(email || roster.email);
        } catch (err) {
          console.warn("[subscribeEmail] non-fatal:", err);
        }
      }
    } else {
      // ---------- CREATE ----------
      if (!email || !isPlausibleEmail(email)) {
        return NextResponse.json({ ok: false, error: "valid email required to create roster" }, { status: 400 });
      }

      // Create with core fields
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

      // Persist optional fields (pins, scoring, optInEmail)
      if (pinsClean || scoring !== undefined || optInEmail !== undefined) {
        roster = await saveRoster(
          roster.id,
          stripUndef({
            pins: pinsClean,
            scoring,
            optInEmail,
          })
        );
      }

      // Try to subscribe; non-fatal
      try {
        await subscribeEmail(email);
      } catch (err) {
        console.warn("[subscribeEmail] non-fatal:", err);
      }
    }

    return NextResponse.json({ ok: true, roster });
  } catch (e) {
    console.error("roster POST error", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
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
  (Object.keys(base) as (keyof RosterRules)[]).forEach((key) => {
    const n = Number((input as any)[key]);
    if (Number.isFinite(n) && n >= 0) out[key] = n;
  });
  return out;
}

function isPlausibleEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
