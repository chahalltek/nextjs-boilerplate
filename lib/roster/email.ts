// lib/roster/email.ts
import type { WeeklyLineup, RosterRules } from "@/lib/roster/types";

/* ---------- types & constants ---------- */

type Slot = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DST" | "K";
const ORDER: Slot[] = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"];

const BASE_RULES: RosterRules = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1 };

type NamesMap = Record<
  string,
  { name?: string; pos?: string; team?: string }
>;

/* ---------- core: compute starters exactly like the UI ---------- */

function normalizePos(pos?: string): Exclude<Slot, "FLEX"> | undefined {
  const p = (pos || "").toUpperCase();
  if (!p) return undefined;
  if (p === "D/ST" || p === "DEF") return "DST";
  if (p === "QB" || p === "RB" || p === "WR" || p === "TE" || p === "DST" || p === "K") return p as any;
  return undefined; // ignore slot labels like "FLEX"/"BENCH"
}

function pointsFor(lineup: WeeklyLineup, pid: string): number {
  return lineup.details?.[pid]?.points ?? -1;
}

function takeTop(
  idsByPoints: string[],
  used: Set<string>,
  need: number,
  wantPos: (p: Exclude<Slot, "FLEX">) => boolean,
  posOf: Record<string, Exclude<Slot, "FLEX"> | undefined>
): string[] {
  const picked: string[] = [];
  for (const pid of idsByPoints) {
    if (picked.length >= need) break;
    if (used.has(pid)) continue;
    const p = posOf[pid];
    if (!p) continue;
    if (wantPos(p)) {
      picked.push(pid);
      used.add(pid);
    }
  }
  return picked;
}

/** Rebuild starters from true positions + rules; bench is everyone else. */
function assignStarters(
  lineup: WeeklyLineup,
  rules?: Partial<RosterRules>,
  names?: NamesMap
): { slots: Record<Slot, string[]>; bench: string[] } {
  const ruleSet: RosterRules = { ...BASE_RULES, ...(rules || {}) };
  // union of all ids the server included
  const allIds = Array.from(
    new Set([
      ...ORDER.flatMap((s) => lineup.slots?.[s] || []),
      ...(lineup.bench || []),
    ])
  );

  // derive *true* positions from names (preferred), fall back to details only if it's a real position
  const posOf: Record<string, Exclude<Slot, "FLEX"> | undefined> = {};
  for (const pid of allIds) {
    const fromNames = normalizePos(names?.[pid]?.pos);
    const fromDetails = normalizePos(lineup.details?.[pid]?.position);
    posOf[pid] = fromNames ?? fromDetails;
  }

  // sort by projected points desc
  const idsByPoints = [...allIds].sort((a, b) => pointsFor(lineup, b) - pointsFor(lineup, a));
  const used = new Set<string>();

  const starters: Record<Slot, string[]> = {
    QB: takeTop(idsByPoints, used, ruleSet.QB, (p) => p === "QB", posOf),
    RB: takeTop(idsByPoints, used, ruleSet.RB, (p) => p === "RB", posOf),
    WR: takeTop(idsByPoints, used, ruleSet.WR, (p) => p === "WR", posOf),
    TE: takeTop(idsByPoints, used, ruleSet.TE, (p) => p === "TE", posOf),
    DST: takeTop(idsByPoints, used, ruleSet.DST, (p) => p === "DST", posOf),
    K:  takeTop(idsByPoints, used, ruleSet.K,  (p) => p === "K",  posOf),
    FLEX: [], // fill next
  };

  // fill FLEX from remaining RB/WR/TE
  starters.FLEX = takeTop(
    idsByPoints, used, ruleSet.FLEX,
    (p) => p === "RB" || p === "WR" || p === "TE", posOf
  );

  const bench = allIds.filter((pid) => !used.has(pid));
  return { slots: starters, bench };
}

/* ---------- tiny label helper ---------- */

function label(pid: string, names?: NamesMap) {
  const n = names?.[pid];
  const nm = n?.name || pid;
  const pos = n?.pos ? ` — ${n.pos}` : "";
  const team = n?.team ? ` (${n.team})` : "";
  return nm + pos + team;
}

/* ---------- public renderers ---------- */

export function renderLineupText(
  coachName: string,
  week: number,
  lineup: WeeklyLineup,
  names?: NamesMap,
  rules?: Partial<RosterRules>
): string {
  const { slots, bench } = assignStarters(lineup, rules, names);

  const lines: string[] = [];
  lines.push(`Lineup Lab — Week ${week}`);
  lines.push(`Hi ${coachName}, Hey Skol Sister here with a friendly reminder that it's time to set your fantasy roster for this week! Here’s your recommended lineup.\n`);
  for (const s of ORDER) {
    lines.push(`${s}`);
    if (!slots[s]?.length) {
      lines.push(`  —`);
    } else {
      for (const pid of slots[s]) {
        const d = lineup.details?.[pid];
        const stats = d ? ` — ${d.points.toFixed(1)} pts • ${Math.round(d.confidence * 100)}% • ${d.tier}` : "";
        lines.push(`  ${label(pid, names)}${stats}`);
      }
    }
    lines.push("");
  }

  lines.push("Bench");
  if (!bench.length) lines.push("  —");
  for (const pid of bench) {
    const d = lineup.details?.[pid];
    const stats = d ? ` — ${d.points.toFixed(1)} pts • ${Math.round(d.confidence * 100)}% • ${d.tier}` : "";
    lines.push(`  ${label(pid, names)}${stats}`);
  }
  return lines.join("\n");
}

export function renderLineupHtml(
  coachName: string,
  week: number,
  lineup: WeeklyLineup,
  names?: NamesMap,
  rules?: Partial<RosterRules>
): string {
  const { slots, bench } = assignStarters(lineup, rules, names);

  const slotGroup = (title: string, ids: string[]) => `
    <div style="margin:16px 0">
      <div style="font:700 12px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.04em;color:#333">${title}</div>
      ${
        ids?.length
          ? ids
              .map((pid) => {
                const d = lineup.details?.[pid];
                const stats = d
                  ? ` — ${d.points.toFixed(1)} pts • ${Math.round(d.confidence * 100)}% • ${d.tier}`
                  : "";
                return `<div style="margin-top:8px;padding:10px 12px;border:1px solid #eee;border-radius:8px;background:#fafafa">
                    <span>${escapeHtml(label(pid, names))}${escapeHtml(stats)}</span>
                </div>`;
              })
              .join("")
          : `<div style="margin-top:8px;padding:10px 12px;border:1px solid #eee;border-radius:8px;background:#fafafa;color:#777">—</div>`
      }
    </div>
  `;

  return `
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <h1 style="margin:0 0 6px 0;font:800 28px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;color:#4b167a">
      Lineup Lab — Week ${week}
    </h1>
    <p style="margin:0 0 20px 0;color:#555">Hi ${escapeHtml(coachName)}, here’s your recommended lineup.</p>

    ${ORDER.map((s) => slotGroup(s, slots[s] || [])).join("")}

    <div style="margin:20px 0 6px 0;font:700 12px/1.2 system-ui;letter-spacing:.04em;color:#333">Bench</div>
    ${
      bench.length
        ? bench
            .map((pid) => {
              const d = lineup.details?.[pid];
              const stats = d
                ? ` — ${d.points.toFixed(1)} pts • ${Math.round(d.confidence * 100)}% • ${d.tier}`
                : "";
              return `<div style="margin-top:8px;padding:10px 12px;border:1px solid #eee;border-radius:8px;background:#fafafa">
                  <span>${escapeHtml(label(pid, names))}${escapeHtml(stats)}</span>
              </div>`;
            })
            .join("")
        : `<div style="margin-top:8px;padding:10px 12px;border:1px solid #eee;border-radius:8px;background:#fafafa;color:#777">—</div>`
    }
  </div>`;
}

/* ---------- tiny util ---------- */

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
