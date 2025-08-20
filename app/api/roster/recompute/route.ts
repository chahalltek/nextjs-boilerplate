// app/api/roster/recompute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoster, saveWeeklyLineup, getLineupNames } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { renderLineupHtml, renderLineupText } from "@/lib/roster/email";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get("id") || "";
    const weekStr = sp.get("week") || "";
    const notifyFlag = (sp.get("notify") || "").toLowerCase();
    const dryRunFlag = (sp.get("dryRun") || "").toLowerCase();

    const week = Number(weekStr);
    const notify = notifyFlag === "1" || notifyFlag === "true" || notifyFlag === "yes";
    const dryRun = dryRunFlag === "1" || dryRunFlag === "true" || dryRunFlag === "yes";

    if (!id || !Number.isFinite(week) || week <= 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid id/week" }, { status: 400 });
    }

    const roster = await getRoster(id);
    if (!roster) {
      return NextResponse.json({ ok: false, error: "Roster not found" }, { status: 404 });
    }

    // Compute lineup
    const lineup = await computeLineup(roster, week);

    // Save (unless dry-run)
    if (!dryRun) {
      await saveWeeklyLineup(id, week, lineup);
    }

    // Optional email
    let emailed: { ok: boolean; id?: string; error?: string } | null = null;
    if (notify && roster.optInEmail && roster.email) {
      if (isEmailConfigured()) {
        const names = await getLineupNames(id, week).catch(() => ({}));
        const subject = `Lineup Lab — Week ${week} starters`;
        const text = renderLineupText(lineup, names);
        const html = renderLineupHtml(lineup, names);
        emailed = await sendEmail({
          to: roster.email,
          subject,
          text,
          html,
        });
      } else {
        emailed = { ok: false, error: "Email not configured" };
      }
    }

    return NextResponse.json({
      ok: true,
      id,
      week,
      saved: !dryRun,
      emailed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
