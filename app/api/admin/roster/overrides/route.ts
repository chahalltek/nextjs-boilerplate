// app/api/admin/roster/overrides/route.ts
import { NextResponse } from "next/server";
import { getOverrides, setOverrides } from "@/lib/roster/store";

export const runtime = "nodejs";

/** Read overrides for a week: /api/admin/roster/overrides?week=1 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const week = Number(searchParams.get("week") || "1");
  const data = await getOverrides(week);
  return NextResponse.json(data);
}

/** Update overrides for a given week (JSON body) */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  const week = Number(body.week || 1);
  if (!Number.isFinite(week) || week <= 0) {
    return NextResponse.json({ error: "week required" }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note : undefined;
  const pointDelta = toNumberMap(body.pointDelta); // Record<string, number> | undefined
  const forceStart = toBoolMap(body.forceStart);   // Record<string, boolean> | undefined
  const forceSit   = toBoolMap(body.forceSit);     // Record<string, boolean> | undefined

  // Do NOT include `week` in the payload
  await setOverrides(week, { note, pointDelta, forceStart, forceSit });

  const updated = await getOverrides(week);
  return NextResponse.json(updated);
}

/* ---------- helpers ---------- */

function toNumberMap(v: any): Record<string, number> | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) {
    // allow [["player_id", 1.5], ...]
    const out: Record<string, number> = {};
    for (const item of v) {
      if (Array.isArray(item) && typeof item[0] === "string") {
        const n = Number(item[1]);
        if (!Number.isNaN(n)) out[item[0]] = n;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof v === "object") {
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(v)) {
      const n = Number(val);
      if (!Number.isNaN(n)) out[k] = n;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

function toBoolMap(v: any): Record<string, boolean> | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) {
    // allow ["player_id", ...]
    const out: Record<string, boolean> = {};
    for (const id of v) if (typeof id === "string" && id.trim()) out[id] = true;
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof v === "object") {
    const out: Record<string, boolean> = {};
    for (const [k, val] of Object.entries(v)) out[k] = Boolean(val);
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}
