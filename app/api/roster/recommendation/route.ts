// app/api/roster/recommendation/route.ts
import { NextResponse } from "next/server";
import { getRoster, getLineupNames } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import type { WeeklyLineup, RosterRules } from "@/lib/roster/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const id = sp.get("id") || "";
    const week = Number(sp.get("week") || "");

    if (!id || !Number.isFinite(week) || week <= 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid id/week" }, { status: 400 });
    }

    const roster = await getRoster(id);
    if (!roster) return NextResponse.json({ ok: false, error: "Roster not found" }, { status: 404 });

    // 1) compute as before
    const lineup = await computeLineup(roster, week);

    // 2) names map (for reliable positions)
    const names = await getLineupNames(id, week).catch(() => ({} as Record<string, any>));

    // 3) rebucket by position and apply FLEX correctly
    const fixed = rebucketLineup(lineup, roster.rules as RosterRules, names);

    return NextResponse.json({ ok: true, lineup: fixed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

/* ---------------- helpers ---------------- */

const CORE: Array<keyof RosterRules> = ["QB", "RB", "WR", "TE", "DST", "K"];
const FLEX_OK = new Set(["RB", "WR", "TE"]);

function posKey(pos?: string) {
  const p = (pos || "").toUpperCase();
  if (p === "DEF" || p === "DST") return "DST";
  if (CORE.includes(p as any)) return p;
  return ""; // unknown
}

function rebucketLineup(
  lu: WeeklyLineup,
  rules: RosterRules | undefined,
  names: Record<string, { pos?: string }>
): WeeklyLineup {
  const want: RosterRules = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, ...(rules || {}) } as any;

  // all player ids present in lineup (starters + bench)
  const inSlots = Object.values(lu.slots || {}).flat();
  const benchIds = lu.bench || [];
  const allIds = Array.from(new Set([...inSlots, ...benchIds]));

  // bucket candidates by their primary position
  const byPos: Record<string, string[]> = { QB: [], RB: [], WR: [], TE: [], DST: [], K: [] };
  for (const pid of allIds) {
    const metaPos = names?.[pid]?.pos || lu.details?.[pid]?.position;
    const key = posKey(metaPos);
    if (key && byPos[key]) byPos[key].push(pid);
  }

  // sort each bucket by projected points desc
  const pts = (id: string) => lu.details?.[id]?.points ?? 0;
  for (const k of Object.keys(byPos)) {
    byPos[k].sort((a, b) => pts(b) - pts(a));
  }

  // fill core slots first
  const newSlots: Record<string, string[]> = { QB: [], RB: [], WR: [], TE: [], DST: [], K: [], FLEX: [] };
  for (const k of CORE) {
    const take = Math.max(0, Number((want as any)[k] ?? 0));
    newSlots[k] = byPos[k].splice(0, take);
  }

  // build a FLEX pool from remaining RB/WR/TE only, most points first
  const flexPool = [...byPos.RB, ...byPos.WR, ...byPos.TE].sort((a, b) => pts(b) - pts(a));
  const flexCount = Math.max(0, Number(want.FLEX || 0));
  for (const pid of flexPool) {
    if (newSlots.FLEX.length >= flexCount) break;
    // don't place if already a starter at its core slot
    if (newSlots.RB.includes(pid) || newSlots.WR.includes(pid) || newSlots.TE.includes(pid)) continue;
    newSlots.FLEX.push(pid);
  }

  // bench = everyone not chosen as a starter
  const chosen = new Set(Object.values(newSlots).flat());
  const newBench = allIds.filter((pid) => !chosen.has(pid)).sort((a, b) => pts(b) - pts(a));

  return { ...lu, slots: newSlots, bench: newBench };
}
