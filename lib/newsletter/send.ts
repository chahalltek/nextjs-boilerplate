import { Resend } from "resend";
import type { NewsletterDraft } from "@/lib/newsletter/store";

// ---------- Config ----------
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://heyskolsister.com";
const LOGO_URL = `${BASE_URL}/email/logo.png`; // place image at /public/email/logo.png
const LINKS = [
  { href: `${BASE_URL}/stats`, label: "Player Projections" },
  { href: `${BASE_URL}/start-sit`, label: "Sit/Start" },
  { href: `${BASE_URL}/blog`, label: "Blog" },
  { href: `${BASE_URL}/roster`, label: "Lineup Lab" },
];

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.NEWSLETTER_FROM || ""; // e.g. "Hey Skol Sister <news@yourdomain.com>"

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ---------- Tiny Markdown -> HTML (email-safe) ----------
function mdToHtml(md: string): string {
  // basic email-safe conversion
  let html = md.trim();

  // escape < and > (but keep minimal link syntax later)
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // bold, italics
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?:^|[^*])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, (m, p1) => m.startsWith("*") ? `<em>${p1}</em>` : m);

  // headings
  html = html.replace(/^###\s+(.*)$/gm, '<h3 style="margin:1rem 0 .25rem;font-size:18px;">$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2 style="margin:1.25rem 0 .5rem;font-size:20px;">$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1 style="margin:1.5rem 0 .75rem;font-size:24px;">$1</h1>');

  // links: [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#6d28d9;text-decoration:none;">$1</a>');

  // unordered list
  // make list blocks
  html = html.replace(/(?:^|\n)(- .*(?:\n- .*)*)/g, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((l) => l.replace(/^- /, "").trim())
      .map((txt) => `<li style="margin:6px 0;">${txt}</li>`)
      .join("");
    return `\n<ul style="padding-left:1.25rem;margin:0.5rem 0;">${items}</ul>`;
  });

  // paragraphs + hard line breaks
  html = html
    .split(/\n{2,}/) // paragraph chunks
    .map((para) => {
      if (/^<(h1|h2|h3|ul)/.test(para.trim())) return para; // don't wrap blocks
      const withBr = para.replace(/\n/g, "<br/>");
      return `<p style="margin:0.5rem 0;line-height:1.6;">${withBr}</p>`;
    })
    .join("");

  return html;
}

function htmlShell(subject: string, innerHtml: string): string {
  const nav =
    LINKS.map(
      (l) =>
        `<a href="${l.href}" style="color:#6d28d9;text-decoration:none;margin:0 8px;">${l.label}</a>`
    ).join('&nbsp;&nbsp;•&nbsp;&nbsp;');

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0f0d18;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0d18;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#111827;border-radius:14px;overflow:hidden;border:1px solid #1f2937;">
            <tr>
              <td align="center" style="padding:24px 24px 8px;">
                <img src="${LOGO_URL}" width="140" alt="Hey Skol Sister" style="display:block;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:4px 24px 16px;color:#d1d5db;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;">
                ${nav}
              </td>
            </tr>
            <tr>
              <td style="background:#0b0a13;height:1px;line-height:1px;font-size:0;"></td>
            </tr>
            <tr>
              <td style="padding:20px 24px;color:#e5e7eb;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 22px;color:#9ca3af;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;">
                Sent by Hey Skol Sister • <a href="${BASE_URL}" style="color:#9ca3af;text-decoration:none;">heyskolsister.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mdToText(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/^###\s+/gm, "")
    .replace(/^##\s+/gm, "")
    .replace(/^#\s+/gm, "")
    .replace(/^\s*-\s+/gm, "• ")
    .trim();
}

// ---------- Public API ----------
export async function sendNewsletter(
  draft: NewsletterDraft,
  opts?: { recipients?: string[] } // if provided => test mode
): Promise<{ sent: number }> {
  if (!resend) throw new Error("RESEND_API_KEY not set.");
  if (!FROM) throw new Error("NEWSLETTER_FROM not set.");

  const subject = draft.subject || "Your weekly Hey Skol Sister rundown!";
  const bodyHtml = mdToHtml(draft.markdown || "");
  const html = htmlShell(subject, bodyHtml);
  const text = mdToText(draft.markdown || "");

  // TEST SEND: send directly to the provided list
  if (opts?.recipients?.length) {
    const unique = Array.from(new Set(opts.recipients));
    await resend.emails.send({
      from: FROM,
      to: unique,
      subject,
      html,
      text,
    });
    return { sent: unique.length };
  }

  // PRODUCTION SEND:
  // Replace this with your audience fetch. For now we no-op to be safe.
  // Example:
  // const allRecipients = await listAudienceEmails(draft.audienceTag);
  const allRecipients: string[] = []; // <- fill from your store

  if (allRecipients.length === 0) {
    // Safety: do not send to zero (prevents accidental blast)
    return { sent: 0 };
  }

  // Use visible "to" and put the rest in BCC batches
  const [first, ...rest] = allRecipients;
  const chunk = (arr: string[], n: number) =>
    arr.reduce<string[][]>((acc, x) => {
      const last = acc[acc.length - 1];
      if (!last || last.length === n) acc.push([x]);
      else last.push(x);
      return acc;
    }, []);
  const batches = chunk(rest, 900); // Resend supports large bcc arrays

  // Send first email with visible "to"
  await resend.emails.send({ from: FROM, to: [first], bcc: batches.shift(), subject, html, text });

  // Send remaining batches as BCC-only (visible "to" uses FROM address)
  for (const b of batches) {
    await resend.emails.send({ from: FROM, to: [FROM], bcc: b, subject, html, text });
  }

  return { sent: allRecipients.length };
}
