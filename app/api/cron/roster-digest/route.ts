// app/api/cron/roster-digest/route.ts
import { NextResponse } from "next/server";
import {
  listRosterIds,
  getRoster,
  getOverrides,
  getLineup,
  saveLineup,
} from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { sendRosterEmail } from "@/lib/email";
import type { WeeklyLineup } from "@/lib/roster/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const week = currentNflWeek();
    const ids = await listRosterIds(); // string[]
    const overrides = await getOverrides(week);
    const dryEmail = !process.env.RESEND_API_KEY; // skip send if not configured

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const roster = await getRoster(id);
        if (!roster?.email) return { skipped: true, reason: "no-email" };

        // compute + cache lineup if missing
        let lineup = await getLineup(id, week);
        if (!lineup) {
          lineup = await computeLineup(roster, week, overrides);
          await saveLineup(id, week, lineup);
        }

        // email (unless in dry mode)
        if (!dryEmail) {
          const html = renderEmail(roster.name || "Coach", week, lineup);
          await sendRosterEmail({
            to: roster.email,
            subject: `Skol Coach – Week ${week} Lineup`,
            html,
          });
        }

        return { ok: true };
      })
    );

    const summary = {
      week,
      totalUsers: ids.length,
      attempted: results.length,
      sent: dryEmail
        ? 0
        : results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
      dryEmail,
    };

    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}

function currentNflWeek(): number {
  // Optional override for testing: set ROSTER_FORCE_WEEK
  const override = Number(process.env.ROSTER_FORCE_WEEK);
  if (Number.isFinite(override) && override > 0) return override;
  // TODO: wire to a real calendar; MVP = Week 1
  return 1;
}

function renderEmail(name: string, week: number, lu: WeeklyLineup) {
  const rows = Object.entries(lu.slots || {})
    .map(([slot, arr]) => {
      const list = Array.isArray(arr) ? arr.join(", ") : "-";
      return `<div><b>${slot}</b>: ${list}</div>`;
    })
    .join("");

  const bench = Array.isArray(lu.bench) ? lu.bench.join(", ") : "-";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 8px">Week ${week} — Your Lineup</h2>
      <p style="margin:0 0 8px">Hi ${escapeHtml(
        name
      )}, here’s your recommended lineup from Skol Coach.</p>
      ${rows}
      <p style="margin:12px 0 0"><b>Bench</b>: ${bench}</p>
      <p style="color:#888;font-size:12px;margin:12px 0 0">Adjustments/overrides may apply.</p>
    </div>
  `;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c]!;
  });
}
