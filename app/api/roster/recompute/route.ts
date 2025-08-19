// app/api/roster/recompute/route.ts
import { NextResponse } from "next/server";
import { computeLineup } from "@/lib/roster/compute";
import { getRoster, saveLineup, getRosterMeta } from "@/lib/roster/store";
import type { WeeklyLineup } from "@/lib/roster/types";
import { renderEmail, sendRosterEmail } from "@/lib/email/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlayerMeta = { name?: string; pos?: string; team?: string };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();
    const weekParam = Number(searchParams.get("week"));
    const notify = searchParams.get("notify") === "1";

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing roster id" }, { status: 400 });
    }

    // Use supplied week or default to 1 (safe fallback)
    const week = Number.isFinite(weekParam) && weekParam > 0 ? weekParam : 1;

    const roster = await getRoster(id);
    if (!roster) {
      return NextResponse.json({ ok: false, error: "Roster not found" }, { status: 404 });
    }

    // Compute lineup and persist
    const next: WeeklyLineup = await computeLineup(roster, week);
    await saveLineup(id, week, next);
    const safeMeta = (rosterMeta as any) ?? {};
    return { pid, pts, pos: guessPos(pid, safeMeta) };

    // Optional email notify (pretty names via meta map)
    if (notify && roster.optInEmail && roster.email) {
      // getRosterMeta’s return type may be declared as a broader “RosterMeta”.
      // We only need the name map: Record<string, PlayerMeta>.
      const metaRaw = await getRosterMeta(id);
      const nameMap: Record<string, PlayerMeta> =
        (metaRaw as unknown as Record<string, PlayerMeta>) || {};

      const html = renderEmail(roster.name || "Coach", week, next, nameMap);
      await sendRosterEmail({
        to: roster.email,
        subject: `Lineup Lab — Week ${week} starters`,
        html,
      });
    }

    return NextResponse.json({ ok: true, id, week, saved: true });
  } catch (e) {
    console.error("[recompute] error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
