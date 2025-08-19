// app/api/cron/roster-digest/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { computeLineup } from "@/lib/roster/compute";
import {
  getRoster,
  saveWeeklyLineup,
  getRosterMeta,
} from "@/lib/roster/store";
import { renderLineupText, renderLineupHtml } from "@/lib/roster/email";
import { sendEmail } from "@/lib/email/mailer";

// Resolve current NFL week via your internal endpoint; fall back to 1.
async function resolveWeek(): Promise<number> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const res = await fetch(`${base}/api/nfl/week`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const wk = Number(data?.week);
    if (Number.isFinite(wk) && wk > 0) return wk;
  } catch {}
  return 1;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";           // required for “Recompute now”
  const notify = ["1", "true", "yes"].includes(
    (url.searchParams.get("notify") || "").toLowerCase()
  );
  const weekParam = Number(url.searchParams.get("week"));
  const week = Number.isFinite(weekParam) && weekParam > 0 ? weekParam : await resolveWeek();

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing roster id (?id=...)" },
      { status: 400 }
    );
  }

  // Load roster
  const roster = await getRoster(id);
  if (!roster) {
    return NextResponse.json(
      { ok: false, error: `Roster not found: ${id}` },
      { status: 404 }
    );
  }

  // Compute lineup and persist as the latest weekly recommendation
  const computed = await computeLineup(roster, week);
  await saveWeeklyLineup(id, week, computed);

  // Optional: email the result if explicitly asked AND user has opted in
  let emailed = false;
  if (notify && roster.optInEmail && roster.email) {
    // Roster meta can be stored either as a flat id->meta map or as { names: {...} }.
    // Normalize to a plain map for the renderer.
    const meta = await getRosterMeta(id);
    const names =
      (meta && (meta as any).names && (meta as any).names) ||
      (meta as any) ||
      ({} as Record<string, { name?: string; pos?: string; team?: string }>);

    const displayName = roster.name?.trim() || "Coach";

    // NOTE: renderLineupText/Html expect (displayName, week, lineup, metaMap)
    const textBody = renderLineupText(displayName, week, computed, names);
    const htmlBody = renderLineupHtml(displayName, week, computed, names);

    await sendEmail({
      to: roster.email!,
      subject: `Lineup Lab — Week ${week} starters`,
      text: textBody,
      html: htmlBody,
    });
    emailed = true;
  }

  return NextResponse.json({
    ok: true,
    id,
    week,
    saved: true,
    emailed,
  });
}
