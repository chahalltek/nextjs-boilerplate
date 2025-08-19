import { NextResponse } from "next/server";
import {
  listRosterIds,
  getRoster,
  getOverrides,
  getLineup,
  saveLineup,
  getRosterMeta,
} from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { sendRosterEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyId = url.searchParams.get("id") || undefined;
  const week = currentNflWeek();
  const ids = onlyId ? [onlyId] : await listRosterIds();
  const overrides = await getOverrides(week);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const roster = await getRoster(id);
      if (!roster?.email) return;

      const prev = await getLineup(id, week);
      let lineup = prev;
      if (!lineup) {
        lineup = await computeLineup(roster, week, overrides);
      }

      const newHash = hashSlots(lineup);
      if (prev?.hash === newHash && !onlyId) return; // unchanged; skip email on cron

      lineup.hash = newHash;
      await saveLineup(id, week, lineup);

      const meta = await getRosterMeta(id);
      const html = renderEmail(roster.name || "Coach", week, lineup, meta);
      await sendRosterEmail({
        to: roster.email,
        subject: `Skol Coach Week ${week} Lineup`,
        html,
      });
    })
  );

  return NextResponse.json({ sent: results.length, week, filtered: !!onlyId });
}

function currentNflWeek() {
  return 1;
}

function hashSlots(lu: { slots: Record<string, string[]>; bench?: string[] }) {
  const s = JSON.stringify({
    ...lu.slots,
    bench: lu.bench || [],
  });
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

type PlayerMeta = { name?: string; pos?: string; team?: string };
function label(pid: string, meta: Record<string, PlayerMeta>) {
  const m = meta?.[pid];
  if (!m) return pid;
  return `${m.name || pid}${m.pos ? ` — ${m.pos}` : ""}${m.team ? ` (${m.team})` : ""}`;
}

function renderEmail(name: string, week: number, lu: any, meta: Record<string, PlayerMeta>) {
  const block = Object.entries(lu.slots)
    .map(([k, arr]: any) => `<div><b>${k}</b>: ${arr.map((id: string) => label(id, meta)).join(", ") || "-"}</div>`)
    .join("");
  const bench = (lu.bench || []).map((id: string) => label(id, meta)).join(", ");
  return `
    <div style="font-family:Arial,sans-serif">
      <h2>Week ${week} — Your Lineup</h2>
      <p>Hi ${name}, here’s your recommended lineup from Skol Coach.</p>
      ${block}
      <p style="margin-top:12px">Bench: ${bench || "-"}</p>
      <p style="color:#888;font-size:12px">Adjustments/overrides may apply.</p>
    </div>`;
}
