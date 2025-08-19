// lib/roster/email.ts
import type { WeeklyLineup } from "@/lib/roster/types";
import type { PlayerMeta } from "@/lib/roster/store";

const ORDER: Array<keyof WeeklyLineup["slots"]> = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"];

function display(pid: string, names: Record<string, PlayerMeta | undefined>) {
  const m = names[pid];
  if (!m) return pid;
  const pos = m.pos ? ` — ${m.pos}` : "";
  const team = m.team ? ` (${m.team})` : "";
  return `${m.name}${pos}${team}`;
}

export function renderLineupText(
  lu: WeeklyLineup,
  names: Record<string, PlayerMeta | undefined>
): string {
  const lines: string[] = [];
  lines.push(`Recommended Lineup — Week ${lu.week}`);
  ORDER.forEach((slot) => {
    const ids = lu.slots?.[slot] || [];
    lines.push(`\n${slot}:`);
    if (ids.length === 0) lines.push("  —");
    ids.forEach((pid) => {
      const d = lu.details?.[pid];
      const metrics = d ? ` — ${d.points.toFixed(1)} pts, ${Math.round(d.confidence * 100)}%, ${d.tier}` : "";
      lines.push(`  • ${display(pid, names)}${metrics}`);
    });
  });
  if (lu.bench?.length) {
    lines.push(`\nBench:`);
    lines.push(
      "  " +
        lu.bench
          .map((pid) => display(pid, names))
          .join(", ")
    );
  }
  if (lu.scores != null) {
    lines.push(`\nProjected starters total: ${Number(lu.scores).toFixed(2)} pts`);
  }
  return lines.join("\n");
}

export function renderLineupHtml(
  lu: WeeklyLineup,
  names: Record<string, PlayerMeta | undefined>
): string {
  const sections = ORDER.map((slot) => {
    const ids = lu.slots?.[slot] || [];
    const lis =
      ids.length === 0
        ? `<li>—</li>`
        : ids
            .map((pid) => {
              const d = lu.details?.[pid];
              const metrics = d
                ? ` <span style="opacity:.8;font-size:12px">· ${d.points.toFixed(1)} pts · ${Math.round(
                    d.confidence * 100
                  )}% · ${d.tier}</span>`
                : "";
              return `<li>${escapeHtml(display(pid, names))}${metrics}</li>`;
            })
            .join("");
    return `<h4 style="margin:8px 0 4px;font-family:system-ui,Segoe UI,Helvetica,Arial;font-size:13px;opacity:.8">${slot}</h4><ul style="margin:0 0 8px 16px;padding:0">${lis}</ul>`;
  }).join("");

  const bench =
    lu.bench?.length
      ? `<h4 style="margin:8px 0 4px;font-family:system-ui,Segoe UI,Helvetica,Arial;font-size:13px;opacity:.8">Bench</h4><p style="margin:0 0 8px 0">${lu.bench
          .map((pid) => escapeHtml(display(pid, names)))
          .join(", ")}</p>`
      : "";

  const total =
    lu.scores != null
      ? `<p style="margin:8px 0 0 0;font-size:13px">Projected starters total: <b>${Number(lu.scores).toFixed(
          2
        )} pts</b></p>`
      : "";

  return `
<div style="font-family:system-ui,Segoe UI,Helvetica,Arial;color:#fff;background:#0b0b0f;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,.08)">
  <div style="font-weight:600;font-size:15px;margin-bottom:8px">Recommended Lineup — Week ${lu.week}</div>
  ${sections}
  ${bench}
  ${total}
</div>`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
