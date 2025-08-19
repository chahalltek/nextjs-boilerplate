// app/api/roster/recompute/route.ts
import { NextResponse } from "next/server";
import { computeLineup } from "@/lib/roster/compute";
import { getRoster, saveLineup, getRosterMeta } from "@/lib/roster/store";
import { renderEmail } from "@/lib/email/roster";

// --- TEMP MAILER STUB --------------------------------------------------
// Replace this with: `import { sendRosterEmail } from "@/lib/email/mailer";`
// once you add a real mailer. For now, it logs so builds succeed.
async function sendRosterEmail(args: { to: string; subject: string; html: string }): Promise<void> {
  console.log("[mailer:stub] Email disabled. Would send to:", args.to, "subject:", args.subject);
}

// --- helpers ------------------------------------------------------------
async function getCurrentWeek(): Promise<number> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const res = await fetch(`${base}/api/nfl/week`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const w = Number(data?.week);
    return Number.isFinite(w) ? w : 1;
  } catch {
    return 1;
  }
}

// --- route --------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    const notify =
      url.searchParams.get("notify") === "1" ||
      url.searchParams.get("notify") === "true";
    const weekParam = url.searchParams.get("week");
    const week = Number(weekParam) || (await getCurrentWeek());

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing ?id" }, { status: 400 });
    }

    const roster = await getRoster(id);
    if (!roster) {
      return NextResponse.json({ ok: false, error: "Roster not found" }, { status: 404 });
    }

    // Compute and persist lineup
    const lineup = await computeLineup(roster, week);
    await saveLineup(id, week, lineup);

    // Optional email notify (no-op if using the stub above)
    if (notify && roster.optInEmail && roster.email) {
      try {
        const meta = await getRosterMeta(id);
        // getRosterMeta may return either a flat map or { names: {...} }; normalize to a flat map
        const nameMap =
          (meta && (meta as any).names) ||
          (meta as Record<string, unknown>) ||
          {};

        const html = renderEmail(
          roster.name || "Coach",
          week,
          lineup,
          nameMap as Record<string, any>
        );

        await sendRosterEmail({
          to: roster.email,
          subject: `Lineup Lab — Week ${week} starters`,
          html,
        });
      } catch (err) {
        console.error("recompute notify error:", err);
        // Don't fail the endpoint if email fails
      }
    }

    return NextResponse.json({ ok: true, id, week, saved: true });
  } catch (err) {
    console.error("recompute GET error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
