// app/api/cron/roster-digest/route.ts
import { NextResponse } from "next/server";
import { listRosterIds, getRoster, getOverrides, getLineup, saveLineup } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { sendRosterEmail } from "@/lib/email";
import type { WeeklyLineup } from "@/lib/roster/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const week = currentNflWeek();
  const ids = await listRosterIds();
  const overrides = await getOverrides(week);

  // Force notify even if unchanged (manual runs): /api/cron/roster-digest?notify=1
  const forceNotify = searchParams.get("notify") === "1";

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const roster = await getRoster(id);
      if (!roster) return;
      const optedIn = roster.optInEmail !== false; // default is true
      const name = roster.name || "Coach";

      // Compute or fetch prior lineup
      let prior = await getLineup(id, week);
      const fresh = await computeLineup(roster, week, overrides);

      // hash starters only (ignore bench order noise)
      const newHash = hashSlots(fresh);
      const oldHash = (prior as any)?.hash as string | undefined;

      // Save new lineup + hash if changed
      if (!prior || oldHash !== newHash) {
        (fresh as any).hash = newHash;
        await saveLineup(id, week, fresh);
        if (optedIn || forceNotify) {
          const html = renderEmail(name, week, fresh);
          await sendRosterEmail({
            to: roster.email,
            subject: `Skol Coach: Week ${week} Lineup Update`,
            html,
          });
        }
      } else if (forceNotify && optedIn) {
        // unchanged but admin asked to notify anyway
        const html = renderEmail(name, week, prior);
        await sendRosterEmail({
          to: roster.email,
          subject: `Skol Coach: Week ${week} Lineup`,
          html,
        });
      }
    })
  );

  return NextResponse.json({ processed: results.length, week });
}

function currentNflWeek() {
  const env = Number(process.env.NFL_CURRENT_WEEK);
  if (Number.isFinite(env) && env > 0) return env;
  return 1; // simple fallback; your /api/nfl/week exists for the client
}

function hashSlots(lu: WeeklyLineup) {
  // only hash starters so email triggers on meaningful changes
  const canonical = JSON.stringify(
    Object.fromEntries(
      Object.entries(lu.slots || {}).map(([k, arr]) => [k, [...(arr || [])].sort()])
    )
  );
  let h = 0;
  for (let i = 0; i < canonical.length; i++) {
    h = (h * 31 + canonical.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function renderEmail(name: string, week: number, lu: WeeklyLineup) {
  const block = Object.entries(lu.slots)
    .map(([k, arr]) => `<div><b>${k}</b>: ${arr.join(", ") || "-"}</div>`)
    .join("");
  const total = lu.scores != null ? Number(lu.scores).toFixed(1) : "-";
  return `
    <div style="font-family:Arial,sans-serif">
      <h2>Week ${week} — Your Lineup</h2>
      <p>Hi ${name}, here’s your recommended lineup from Skol Coach.</p>
      ${block}
      <p style="margin-top:12px">Bench: ${lu.bench?.join(", ") || "-"}</p>
      <p style="margin-top:12px"><b>Total starters projection:</b> ${total}</p>
      <p style="color:#888;font-size:12px;margin-top:16px">
        You’re getting this because lineup meaningfully changed
        ${lu.recommendedAt ? ` (updated ${new Date(lu.recommendedAt).toLocaleString()})` : ""}.
      </p>
    </div>`;
}
