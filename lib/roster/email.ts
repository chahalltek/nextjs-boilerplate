// lib/roster/email.ts
import type { WeeklyLineup } from "./types";

type NameMap = Record<string, { name?: string; pos?: string; team?: string }>;

const ORDER = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"] as const;

const fmt = (d?: WeeklyLineup["details"][string]) =>
  d ? ` — ${d.points.toFixed(1)} pts • ${Math.round(d.confidence * 100)}% • ${d.tier}` : "";

export function renderLineupText(teamName: string, week: number, lu: WeeklyLineup, names: NameMap = {}) {
  const label = (id: string) => {
    const n = names[id] || {};
    const parts = [n.name ?? id, n.pos, n.team ? `(${n.team})` : ""].filter(Boolean);
    return parts.join(" ");
  };

  const lines: string[] = [];
  lines.push(`Lineup Lab — Week ${week}`);
  lines.push(`Hi ${teamName}, here’s your recommended lineup.\n`);

  for (const slot of ORDER) {
    const ids = lu.slots?.[slot] ?? [];
    lines.push(slot);
    if (ids.length) {
      for (const id of ids) lines.push(`  - ${label(id)}${fmt(lu.details?.[id])}`);
    } else {
      lines.push("  —");
    }
    lines.push("");
  }

  if (lu.bench?.length) {
    lines.push("Bench");
    for (const id of lu.bench) lines.push(`  - ${label(id)}`);
  }

  return lines.join("\n");
}

export function renderLineupHtml(teamName: string, week: number, lu: WeeklyLineup, names: NameMap = {}) {
  const label = (id: string) => {
    const n = names[id] || {};
    const base = [n.name ?? id, n.pos, n.team ? `(${n.team})` : ""].filter(Boolean).join(" ");
    return `${base}${fmt(lu.details?.[id])}`;
  };

  const section = (title: string, ids: string[]) => {
    const items =
      ids.length === 0
        ? `<div style="padding:10px 12px;border:1px solid #eee;border-radius:8px;color:#666">—</div>`
        : ids
            .map(
              (id) =>
                `<div style="padding:10px 12px;border:1px solid #eee;border-radius:8px;margin-bottom:6px">${label(
                  id
                )}</div>`
            )
            .join("");
    return `<h3 style="margin:16px 0 8px 0;font-family:system-ui"> ${title} </h3>${items}`;
  };

  const body =
    ORDER.map((slot) => section(slot, lu.slots?.[slot] ?? [])).join("") +
    (lu.bench?.length ? section("Bench", lu.bench) : "");

  return `<!doctype html>
<html>
  <body style="background:#f7f7f8;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;padding:20px">
      <h1 style="text-align:center;font-family:system-ui;margin:8px 0 0 0">Lineup Lab — Week ${week}</h1>
      <p style="text-align:center;margin:4px 0 16px 0;color:#555">Hi ${teamName}, here’s your recommended lineup.</p>
      ${body}
    </div>
  </body>
</html>`;
}
