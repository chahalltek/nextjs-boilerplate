import { NextResponse } from "next/server";
import {
  createRoster,
  saveRoster,
  getRoster,
  mergeRosterMeta,
} from "@/lib/roster/store";

export const runtime = "nodejs";

/**
 * GET /api/roster?id=ROSTER_ID
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const roster = await getRoster(id);
  if (!roster) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ roster });
}

/**
 * POST /api/roster
 * - Create: { email, name?, players?, rules?, scoring?, optInEmail?, meta? }
 * - Update: { id, name?, players?, pins?, rules?, scoring?, optInEmail?, meta? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const id: string | undefined = body.id?.toString().trim() || undefined;
    const email: string | undefined = body.email?.toString().trim() || undefined;
    const name: string | undefined = body.name?.toString() || undefined;

    // Optional inputs
    const players: unknown = body.players;
    const pins: unknown = body.pins;
    const rules: unknown = body.rules;
    const scoring: unknown = body.scoring;
    const optInEmail: boolean | undefined =
      typeof body.optInEmail === "boolean" ? body.optInEmail : undefined;
    const meta: Record<string, { name?: string; pos?: string; team?: string }> | undefined =
      body.meta && typeof body.meta === "object" ? body.meta : undefined;

    // Validate players list
    const list: string[] | undefined = Array.isArray(players)
      ? (players as any[]).map(String).filter(Boolean)
      : undefined;

    // Validate pins (only FLEX supported here)
    const pinsClean:
      | { FLEX?: string[] }
      | undefined = pins && typeof pins === "object"
      ? {
          FLEX: Array.isArray((pins as any).FLEX)
            ? (pins as any).FLEX.map(String).filter(Boolean)
            : undefined,
        }
      : undefined;

    // Validate rules (pick known keys)
    const rulesClean = normalizeRules(rules);

    // Create or update
    let roster =
      id
        ? await saveRoster(
            id,
            stripUndef({
              name,
              players: list,
              pins: pinsClean,
              rules: rulesClean,
              scoring: isValidScoring(scoring) ? scoring : undefined,
              optInEmail,
            })
          )
        : await createRoster(
            stripUndef({
              email: email!, // required on create
              name,
              players: list,
              rules: rulesClean,
              scoring: isValidScoring(scoring) ? scoring : undefined,
              optInEmail,
            })
          );

    // Merge any per-player meta (incremental cache)
    if (meta && roster?.id) {
      await mergeRosterMeta(roster.id, meta);
      // re-read for freshness if you like; not required:
      // roster = await getRoster(roster.id) ?? roster;
    }

    return NextResponse.json({ roster });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/* ---------------- helpers ---------------- */

function stripUndef<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function normalizeRules(input: unknown):
  | {
      QB?: number;
      RB?: number;
      WR?: number;
      TE?: number;
      FLEX?: number;
      DST?: number;
      K?: number;
    }
  | undefined {
  if (!input || typeof input !== "object") return undefined;
  const keys = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"] as const;
  const out: any = {};
  for (const k of keys) {
    const n = Number((input as any)[k]);
    if (Number.isFinite(n)) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

function isValidScoring(x: unknown): x is "PPR" | "HALF_PPR" | "STD" {
  return x === "PPR" || x === "HALF_PPR" || x === "STD";
}
