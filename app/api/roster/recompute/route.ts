// app/api/roster/recompute/route.ts  (only the changed parts)
import { NextRequest, NextResponse } from "next/server";
import { getRoster, saveWeeklyLineup, getLineupNames } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { renderLineupHtml, renderLineupText } from "@/lib/roster/email";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";
import type { WeeklyLineup } from "@/lib/roster/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get("id") || "";
    const week = Number(sp.get("week") || "");
    const notify = ["1", "true", "yes"].includes((sp.get("notify") || "").toLowerCase());
    const dryRun = ["1", "true", "yes"].includes((sp.get("dryRun") || "").toLowerCase());

    if (!id || !Number.isFinite(week) || week <= 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid id/week" }, { status: 400 });
    }

    const roster = await getRoster(id);
    if (!roster) return NextResponse.json({ ok: false, error: "Roster not found" }, { status: 404 });

    const lineup: WeeklyLineup = await computeLineup(roster, week);
    if (!dryRun) await saveWeeklyLineup(id, week, lineup);

    // ---- resolve names for email rendering
    let names: Record<string, { name?: string; pos?: string; team?: string }> =
      (await getLineupNames(id, week).catch(() => ({}))) || {};

    if (!names || Object.keys(names).length === 0) {
      const order = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"] as const;
      const allIds = Array.from(
        new Set([...(order.flatMap((s) => lineup.slots?.[s] || [])), ...(lineup.bench || [])])
      );
      if (allIds.length) {
        const origin = request.nextUrl.origin; // same host (works on Vercel)
        const url = `${origin}/api/players/ids?ids=${encodeURIComponent(allIds.join(","))}`;
        const res = await fetch(url, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        names = j?.map || {};
      }
    }

    // ---- optional email
    let emailed: { ok: boolean; id?: string; error?: string } | null = null;
    if (notify && roster.optInEmail && roster.email) {
      if (isEmailConfigured()) {
        const subject = `Lineup Lab — Week ${week} starters`;
        const coachName = roster.name || "Coach";
        const text = renderLineupText(coachName, week, lineup, names);
        const html = renderLineupHtml(coachName, week, lineup, names);
        emailed = await sendEmail({ to: roster.email, subject, text, html });
      } else {
        emailed = { ok: false, error: "Email not configured" };
      }
    }

    return NextResponse.json({ ok: true, id, week, saved: !dryRun, emailed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
