// app/api/roster/recompute/route.ts
import { NextResponse } from "next/server";

import { computeLineup } from "@/lib/roster/compute";
import {
  getRoster,
  saveLineup,
  getRosterMeta, // <- used for name map
} from "@/lib/roster/store";
import { sendRosterEmail, renderEmail } from "@/lib/email/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recompute a single roster’s lineup for a given week.
 * query: ?id=<rosterId>&week=<n>&notify=1
 * - id (required): roster id
 * - week (required): NFL week number
 * - notify (optional): if "1", email the result if the roster is opted-in
 */
export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  const week = Number(searchParams.get("week") || "0");
  const notify = searchParams.get("notify") === "1";

  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }
  if (!Number.isFinite(week) || week <= 0) {
    return NextResponse.json({ ok: false, error: "valid week is required" }, { status: 400 });
  }

  try {
    const roster = await getRoster(id);
    if (!roster) {
      return NextResponse.json({ ok: false, error: "roster not found" }, { status: 404 });
    }

    // Compute lineup (admin overrides are applied inside compute if you wire them there;
    // otherwise you can fetch overrides here and pass them in)
    const next = await computeLineup(roster, week);

    // Persist the fresh lineup
    await saveLineup(id, week, next);

    // Optionally email the user if they opted in
    if (notify && roster.optInEmail && roster.email) {
      // IMPORTANT: meta can be null — pass a safe empty map to renderEmail
      const meta = await getRosterMeta(id); // { names?: Record<string, PlayerMeta> } | null
      const html = renderEmail(roster.name || "Coach", week, next, meta?.names ?? {});
      await sendRosterEmail({
        to: roster.email,
        subject: `Lineup Lab — Week ${week} starters`,
        html,
      });
    }

    return NextResponse.json({ ok: true, id, week, notified: !!(notify && roster.optInEmail && roster.email), lineup: next });
  } catch (e) {
    console.error("recompute error:", e);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
