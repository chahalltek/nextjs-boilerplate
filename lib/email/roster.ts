// lib/email/roster.ts
import type { WeeklyLineup } from "@/lib/roster/types";

type PlayerMeta = { name?: string; pos?: string; team?: string };

const ORDER: Array<keyof WeeklyLineup["slots"]> = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"];

/**
 * Render a simple HTML email using player NAMEs via the provided name map.
 */
export function renderEmail(
  teamName: string,
  week: number,
  lineup: WeeklyLineup,
  names: Record<string, PlayerMeta>
): string {
  const fmt = (pid: string) => {
    const m = names[pid] || {};
    const label =
      (m.name || pid) +
      (m.pos ? ` — ${m.pos}` : "") +
      (m.team ? ` (${m.team})` : "");
    const det = lineup.details?.[pid];
    const right = det
      ? `${det.points.toFixed(1)} pts • ${Math.round(det.confidence * 100)}% • ${det.tier}`
      : "";
    return `<tr><td>${escapeHtml(label)}</td><td style="text-align:right;color:#9aa4af">${escapeHtml(
      right
    )}</td></tr>`;
  };

  const sections = ORDER.map((slot) => {
    const ids = lineup.slots?.[slot] || [];
    const rows = ids.map(fmt).join("");
    return `
      <h3 style="margin:16px 0 8px 0;font-size:14px;color:#9aa4af;text-transform:uppercase;letter-spacing:.04em">${slot}</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows || emptyRow()}</table>
    `;
  }).join("");

  const benchRows = (lineup.bench || []).map((pid) => {
    const m = names[pid] || {};
    const label =
      (m.name || pid) +
      (m.pos ? ` — ${m.pos}` : "") +
      (m.team ? ` (${m.team})` : "");
    return `<li>${escapeHtml(label)}</li>`;
  }).join("");

  const total = typeof lineup.scores === "number" ? lineup.scores.toFixed(2) : "";

  return `<!doctype html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Lineup Lab — Week ${week}</title>
  </head>
  <body style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#0b0d12;color:#e5e7eb;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#121521;border:1px solid #2a2f3a;border-radius:12px;padding:20px">
      <h1 style="margin:0 0 4px 0">Lineup Lab</h1>
      <p style="margin:0 0 16px 0;color:#9aa4af">Week ${week} starters for <b style="color:#e5e7eb">${escapeHtml(
        teamName || "Coach"
      )}</b>${total ? ` — <span style="color:#e5e7eb">Total proj: ${escapeHtml(total)}</span>` : ""}</p>

      ${sections}

      <h3 style="margin:16px 0 8px 0;font-size:14px;color:#9aa4af;text-transform:uppercase;letter-spacing:.04em">Bench</h3>
      ${benchRows ? `<ul style="margin:0 0 12px 20px;padding:0;line-height:1.6">${benchRows}</ul>` : `<p style="margin:0;color:#9aa4af">—</p>`}

      <p style="margin:16px 0 0 0;color:#9aa4af;font-size:12px">
        Heads up: recommendations may adjust with injury/projection updates. You’ll only get another email if the lineup meaningfully changes.
      </p>
    </div>
  </body>
</html>`;
}

function emptyRow() {
  return `<tr><td style="color:#9aa4af">—</td><td></td></tr>`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string)
  );
}

/**
 * Fire-and-forget sender. If EMAIL_WEBHOOK_URL is set, POSTs {to,subject,html}.
 * Otherwise logs and resolves so builds aren’t blocked.
 */
export async function sendRosterEmail(opts: { to: string; subject: string; html: string }) {
  const url = process.env.EMAIL_WEBHOOK_URL;
  if (!url) {
    console.log("[email:dry-run]", { to: opts.to, subject: opts.subject });
    return;
  }
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(opts),
  }).catch((e) => {
    console.error("EMAIL_WEBHOOK_URL send failed:", e);
  });
}
