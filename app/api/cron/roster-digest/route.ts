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
  const week = currentNflWeek();
  const ids = await listRosterIds();
  const overrides = await getOverrides(week);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const roster = await getRoster(id);
      if (!roster?.email) return;

      // compute or load
      let lineup = await getLineup(id, week);
      if (!lineup) {
        lineup = await computeLineup(roster, week, overrides);
      }

      // change detection
      const newHash = hashSlots(lineup);
      const changed = lineup.hash !== newHash;
      if (changed) {
        lineup = { ...lineup, hash: newHash };
        await saveLineup(id, week, lineup);
      }

      // email regardless (or gate on `changed` if you prefer)
      const html = renderEmail(roster.name || "Coach", week, lineup);
      await sendRosterEmail({
        to: roster.email,
        subject: `Skol Coach — Week ${week} Lineup`,
        html,
      });
    })
  );

  return NextResponse.json({ processed: ids.length, ok: results.filter(r => r.status === "fulfilled").length });
}

function currentNflWeek() {
  // MVP placeholder; swap to real calendar/endpoint later
  return 1;
}

function hashSlots(lu: WeeklyLineup): string {
  // Simple stable hash of the slots structure
  const s = JSON.stringify(lu.slots);
  let h = 2166136261 >>> 0; // FNV-1a-ish
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function renderEmail(name: string, week: number, lu: WeeklyLineup) {
  const slotBlock = Object.entries(lu.slots)
    .map(([k, arr]) => `<div><b>${k}</b>: ${arr.join(", ") || "-"}</div>`)
    .join("");

  const scoresBlock = lu.scores
    ? `<p style="margin-top:8px"><b>Projected Total:</b> ${lu.scores.total ?? "-"} pts</p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif">
      <h2>Week ${week} — Your Lineup</h2>
      <p>Hi ${name}, here’s your recommended lineup from Skol Coach.</p>
      ${slotBlock}
      <p style="margin-top:12px">Bench: ${lu.bench?.join(", ") || "-"}</p>
      ${scoresBlock}
      <p style="color:#888;font-size:12px;margin-top:12px">
        Adjustments/overrides may apply. You can tweak your roster in the app anytime.
      </p>
    </div>
  `;
}
