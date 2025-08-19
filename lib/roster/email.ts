// lib/roster/email.ts
import type { WeeklyLineup } from "@/lib/roster/types";

// Minimal player metadata used purely for rendering names in emails.
export type PlayerMeta = {
  name?: string;
  pos?: string;
  team?: string;
};

const ORDER: Array<keyof WeeklyLineup["slots"]> = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"];

function label(pid: string, metaMap: Record<string, PlayerMeta>) {
  const m = metaMap[pid] || {};
  const nm = m.name || pid;
  const pos = m.pos ? ` — ${m.pos}` : "";
  const tm = m.team ? ` (${m.team})` : "";
  return `${nm}${pos}${tm}`;
}

function section(title: string, rows: string) {
  return `
    <div style="border:1px solid #eee;background:#fafafa;border-radius:12px;padding:12px;margin:8px 0;">
      <div style="font:600 12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; letter-spacing:.04em; color:#666; text-transform:uppercase; margin-bottom:8px;">
        ${title}
      </div>
      ${rows}
    </div>`;
}

export function renderEmail(
  displayName: string,
  week: number,
  lu: WeeklyLineup,
  metaMap: Record<string, PlayerMeta>
): string {
  const header = `
    <div style="text-align:center;margin:8px 0 16px 0;">
      <div style="font:700 22px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">Lineup Lab — Week ${week}</div>
      <div style="font:400 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#555;">
        Hi ${escapeHtml(displayName)}, here’s your recommended lineup.
      </div>
    </div>`;

  const slotSections = ORDER.map((slot) => {
    const ids = lu.slots?.[slot] || [];
    if (!ids.length) return section(slot, `<div style="color:#777;font:14px system-ui;">—</div>`);
    const rows = ids
      .map((pid) => {
        const d = lu.details?.[pid];
        const right =
          d
            ? `${d.points.toFixed(1)} pts · ${Math.round(d.confidence * 100)}% · ${d.tier}`
            : "";
        return row(label(pid, metaMap), right);
      })
      .join("");
    return section(slot, rows);
  }).join("");

  const benchRows = (lu.bench || [])
    .map((pid) => row(label(pid, metaMap), ""))
    .join("");

  const totals =
    typeof lu.scores === "number"
      ? `<div style="margin-top:8px;text-align:right;color:#333;font:600 14px system-ui;">Total starters: ${lu.scores.toFixed?.(2) ?? lu.scores}</div>`
      : "";

  const footer = `
    <div style="margin-top:16px;color:#777;font:12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;line-height:1.4">
      Projections adjust as news breaks. If something meaningfully changes, we’ll resend an update.
      <br/>This blend of art + science uses projections, injuries, opponent difficulty, and (when needed) human overrides.
    </div>`;

  return wrap(`${header}${slotSections}${section("Bench", benchRows || `<div style="color:#777;font:14px system-ui;">—</div>`)}${totals}${footer}`);
}

/** Back-compat wrappers expected by /api/cron/roster-digest */
export function renderLineupHtml(
  displayName: string,
  week: number,
  lu: WeeklyLineup,
  metaMap: Record<string, PlayerMeta>
) {
  return renderEmail(displayName, week, lu, metaMap);
}

export function renderLineupText(
  displayName: string,
  week: number,
  lu: WeeklyLineup,
  metaMap: Record<string, PlayerMeta>
) {
  const lines: string[] = [];
  lines.push(`Lineup Lab — Week ${week}`);
  lines.push(`Hi ${displayName}, here’s your recommended lineup.`);
  lines.push("");

  for (const slot of ORDER) {
    lines.push(slot);
    const ids = lu.slots?.[slot] || [];
    if (!ids.length) {
      lines.push("  —");
    } else {
      for (const pid of ids) {
        const d = lu.details?.[pid];
        const right = d ? `${d.points.toFixed(1)} pts · ${Math.round(d.confidence * 100)}% · ${d.tier}` : "";
        lines.push(`  - ${label(pid, metaMap)}${right ? ` — ${right}` : ""}`);
      }
    }
    lines.push("");
  }

  lines.push("Bench");
  if (!lu.bench?.length) {
    lines.push("  —");
  } else {
    for (const pid of lu.bench) {
      lines.push(`  - ${label(pid, metaMap)}`);
    }
  }

  if (typeof lu.scores === "number") {
    lines.push("");
    lines.push(`Total starters: ${lu.scores.toFixed?.(2) ?? lu.scores}`);
  }

  return lines.join("\n");
}

/* ---------------- helpers ---------------- */

function row(left: string, right: string) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:8px;background:#fff;border:1px solid #eee;margin:6px 0;">
      <span style="font:14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;color:#222;">${escapeHtml(left)}</span>
      ${right ? `<span style="font:12px system-ui;color:#666;margin-left:12px;white-space:nowrap;">${escapeHtml(right)}</span>` : ""}
    </div>`;
}

function wrap(inner: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f5f7;padding:24px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="background:#ffffff;border:1px solid #e9eaef;border-radius:16px;padding:18px;">
          <tr><td>
            ${inner}
          </td></tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
