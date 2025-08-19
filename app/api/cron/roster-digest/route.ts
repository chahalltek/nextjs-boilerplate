import { NextResponse } from "next/server";
import { listRosterIds, getRoster, getOverrides, getLineup, saveLineup } from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { sendRosterEmail } from "@/lib/email";
import { currentNflWeek } from "@/lib/roster/week";
import { createHash } from "crypto";

export const runtime = "nodejs";

function hashSlots(lu: any) {
  return createHash("sha1").update(JSON.stringify(lu?.slots || {})).digest("hex");
}

export async function GET() {
  const week = currentNflWeek();
  const ids = await listRosterIds();
  const overrides = await getOverrides(week);

  const results = await Promise.allSettled(ids.map(async (id) => {
    const roster = await getRoster(id);
    if (!roster?.email) return;

    let lineup = await getLineup(id, week);
    if (!lineup) lineup = await computeLineup(roster, week, overrides);

    const newHash = hashSlots(lineup);
    if (lineup.hash === newHash) return; // no meaningful change

    lineup.hash = newHash;
    await saveLineup(id, week, lineup);

    await sendRosterEmail({
      to: roster.email,
      subject: `Skol Coach Week ${week} Lineup`,
      html: renderEmail(roster.name || "Coach", week, lineup),
    });
  }));

  return NextResponse.json({ checked: ids.length, sent: results.filter(r=>r.status==="fulfilled").length });
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
      <p style="color:#888;font-size:12px">We’ll email only when your lineup materially changes.</p>
    </div>`;
}
