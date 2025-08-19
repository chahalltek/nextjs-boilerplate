// app/api/cron/roster-digest/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  listRosterIds,
  getRoster,
  getLineup,
  saveLineup,
  getOverrides,
  setLineupNames,
} from "@/lib/roster/store";
import { computeLineup } from "@/lib/roster/compute";
import { renderLineupText, renderLineupHtml } from "@/lib/roster/email";

// ---------- Small helpers ----------

function normalizeBool(v: string | null): boolean {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** stable-ish hash over slots + week to detect changes */
function hashSlots(lu: { week: number; slots: Record<string, string[]> }) {
  // Only consider the ordered contents of each slot for change detection.
  const keys = Object.keys(lu.slots).sort();
  const parts = [String(lu.week)];
  for (const k of keys) parts.push(k, ...(lu.slots[k] || []));
  // FNV-1a tiny impl
  let h = 2166136261 >>> 0;
  for (let i = 0; i < parts.length; i++) {
    const s = parts[i];
    for (let j = 0; j < s.length; j++) {
      h ^= s.charCodeAt(j);
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return h.toString(16);
}

/** get current NFL week from internal endpoint or fallback to 1 */
async function getCurrentWeek(): Promise<number> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    const res = await fetch(`${base}/api/nfl/week`, { cache: "no-store" });
    const j = await res.json().catch(() => ({} as any));
    const w = Number(j?.week);
    return Number.isFinite(w) && w > 0 ? w : 1;
  } catch {
    return 1;
  }
}

/** compact union of IDs appearing in lineup */
function collectIds(lu: { slots: Record<string, string[]>; bench?: string[] }) {
  const ids = new Set<string>();
  Object.values(lu.slots || {}).forEach((arr) => (arr || []).forEach((id) => ids.add(id)));
  (lu.bench || []).forEach((id) => ids.add(id));
  return Array.from(ids);
}

/** fetch name/pos/team in one shot via your existing API (graceful fallback) */
async function fetchNamesMap(ids: string[]): Promise<Record<string, { name: string; pos?: string; team?: string }>> {
  if (!ids.length) return {};
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    const url = `${base}/api/players/names?ids=${encodeURIComponent(ids.join(","))}`;
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json().catch(() => ({} as any));
    // expected shape: { map: { [id]: {name,pos,team} } }
    return (j?.map as Record<string, { name: string; pos?: string; team?: string }>) || {};
  } catch {
    return {};
  }
}

/** very light mailer: post to webhook if provided, else no-op (logs) */
async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const webhook = process.env.LINEUP_EMAIL_WEBHOOK_URL;
  if (!webhook) {
    console.log("[digest] (dry-run) Would email:", { to, subject });
    return;
  }
  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to, subject, text, html }),
  });
}

// ---------- Main handler ----------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const onlyId = searchParams.get("id");
  const notify = normalizeBool(searchParams.get("notify"));
  const week = Number(searchParams.get("week")) || (await getCurrentWeek());

  // Build the work list
  const ids = onlyId ? [onlyId] : await listRosterIds();

  const results: Array<{ id: string; changed: boolean; emailed: boolean; reason?: string }> = [];

  for (const id of ids) {
    try {
      const roster = await getRoster(id);
      if (!roster) {
        results.push({ id, changed: false, emailed: false, reason: "roster not found" });
        continue;
      }

      // Compute fresh lineup
      const overrides = await getOverrides(week);
      const computed = await computeLineup(roster, week, overrides);
      const newHash = hashSlots({ week, slots: computed.slots });

      // Load existing to compare
      const existing = await getLineup(id, week);
      const hasChanged = !existing || (existing as any).hash !== newHash;

      // Always save the latest lineup + hash (even if unchanged)
      const toSave = { ...computed, hash: newHash } as any;
      await saveLineup(id, week, toSave);

      // Build & store names map for this lineup (used by email + UI)
      const allIds = collectIds(computed);
      const names = await fetchNamesMap(allIds);
      await setLineupNames(id, week, names);

      // Decide whether to email
      const canEmail = Boolean(roster.email) && roster.optInEmail !== false;
      const shouldEmail = notify || hasChanged; // notify=1 forces an email
      let emailed = false;

      if (canEmail && shouldEmail) {
        const textBody = renderLineupText(computed, names);
        const htmlBody = renderLineupHtml(computed, names);
        await sendEmail({
          to: roster.email!,
          subject: `Lineup Lab — Week ${week} recommendation`,
          text: textBody,
          html: htmlBody,
        });
        emailed = true;
      }

      results.push({ id, changed: hasChanged, emailed });
    } catch (e: any) {
      results.push({ id, changed: false, emailed: false, reason: String(e?.message || e) });
    }
  }

  return NextResponse.json({ week, count: results.length, results });
}
