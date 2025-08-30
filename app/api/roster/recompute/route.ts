// app/api/roster/recompute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoster, saveWeeklyLineup, getLineupNames } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { renderLineupHtml, renderLineupText } from "@/lib/roster/email";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";
import type { WeeklyLineup } from "@/lib/roster/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  return handler("GET", req);
}

export async function POST(req: NextRequest) {
  return handler("POST", req);
}

async function handler(method: "GET" | "POST", request: NextRequest) {
  try {
    let id = "";
    let week = NaN;
    let notify = false;
    let dryRun = false;

    if (method === "GET") {
      const sp = request.nextUrl.searchParams;
      id = sp.get("id") || "";
      week = Number(sp.get("week") || "");
      notify = ["1", "true", "yes"].includes((sp.get("notify") || "").toLowerCase());
      dryRun = ["1", "true", "yes"].includes((sp.get("dryRun") || "").toLowerCase());
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        id?: string;
        week?: number | string;
        notify?: boolean;
        dryRun?: boolean;
      };
      id = String(body.id || "");
      week = Number(body.week);
      notify = Boolean(body.notify);
      dryRun = Boolean(body.dryRun);
    }

    if (!id || !Number.isFinite(week) || week <= 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid id/week" }, { status: 400 });
    }

    const roster = await getRoster(id);
    if (!roster) {
      return NextResponse.json({ ok: false, error: "Roster not found" }, { status: 404 });
    }

    // Compute lineup
    const lineup: WeeklyLineup = await computeLineup(roster, week);

    // Save unless dry-run
    if (!dryRun) {
      await saveWeeklyLineup(id, week, lineup);
    }

    // Optional email
    let emailed: { ok: boolean; id?: string; error?: string } | null = null;
    if (notify && roster.optInEmail && roster.email) {
      if (isEmailConfigured()) {
        const names = await getLineupNames(id, week).catch(() => ({}));
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
    console.error("recompute error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
