import { NextResponse } from "next/server";
import { listRosterIds, getRoster, getOverrides, getLineup, saveLineup } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { sendRosterEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
  const week = currentNflWeek();
  const ids = await listRosterIds();
  const overrides = await getOverrides(week);

  // fan out (KV hobby scale-friendly)
  const results = await Promise.allSettled(ids.map(async (id) => {
    const roster = await getRoster(id);
    if (!roster?.email) return;

    let lineup = await getLineup(id, week);
    if (!lineup) {
      lineup = await computeLineup(roster, week, overrides);
      await saveLineup(id, week, lineup);
    }

    const html = renderEmail(roster.name || "Coach", week, lineup);
    await sendRosterEmail({
      to: roster.email,
      subject: `Skol Coach Week ${week} Lineup`,
      html,
    });
  }));

  return NextResponse.json({ sent: results.length });
}

function currentNflWeek() {
  // MVP: let’s just use 1; you can swap to a real calendar later
  return 1;
}

function renderEmail(name: string, week: number, lu: any) {
  const block = Object.entries(lu.slots)
    .map(([k, arr]: any) => `<div><b>${k}</b>: ${arr.join(", ") || "-"}</div>`)
    .join("");
  return `
    <div style="font-family:Arial,sans-serif">
      <h2>Week ${week} — Your Lineup</h2>
      <p>Hi ${name}, here’s your recommended lineup from Skol Coach.</p>
      ${block}
      <p style="margin-top:12px">Bench: ${lu.bench?.join(", ") || "-"}</p>
      <p style="color:#888;font-size:12px">Adjustments/overrides may apply.</p>
    </div>`;
}
