// lib/newsletter/send.ts
import type { NewsletterDraft } from "./store";
import { listSubscribers } from "@/lib/subscribers/store";

/** Tiny Markdown → basic HTML for email */
function mdToBasicHtml(md: string) {
  return md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => {
      if (l.startsWith("# ")) return `<h1>${l.slice(2)}</h1>`;
      if (l.startsWith("## ")) return `<h2>${l.slice(3)}</h2>`;
      if (l.startsWith("### ")) return `<h3>${l.slice(4)}</h3>`;
      if (l.startsWith("- ")) return `<li>${l.slice(2)}</li>`;
      if (!l.trim()) return "";
      return `<p>${l}</p>`;
    })
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
}

/** Plain-text fallback */
function mdToText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .replace(/[#*_>`]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Normalize + dedupe emails */
function cleanEmails(input?: string[] | null): string[] {
  if (!input) return [];
  const r = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const out = new Set<string>();
  for (const raw of input) {
    const e = String(raw || "").toLowerCase().replace(/[<>,"']/g, "").trim();
    if (r.test(e)) out.add(e);
  }
  return [...out];
}

function chunk<T>(arr: T[], n = 75): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Send using Resend with BCC-only delivery.
 * All recipients go in BCC; a single friendly "to" header is used for compliance.
 */
async function sendWithResend(bccList: string[], subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const FROM = process.env.NEWSLETTER_FROM || "Skol Sisters <news@heyskolsister.com>";
  const TO_HEADER = process.env.NEWSLETTER_TO || FROM; // friendly To header (not the audience)
  const LIST_UNSUB = process.env.NEWSLETTER_UNSUB_URL || "";
  const CHUNK_SIZE = Number(process.env.NEWSLETTER_BCC_CHUNK || 75);

  if (!key) return false;

  const { Resend } = await import("resend");
  const resend = new Resend(key);

  const headers: Record<string, string> = { Precedence: "bulk" };
  if (LIST_UNSUB) headers["List-Unsubscribe"] = `<${LIST_UNSUB}>`;

  for (const bcc of chunk(bccList, CHUNK_SIZE)) {
    try {
     await resend.emails.send({
  from,
  to: [from],        // a single visible "to"
  bcc: batch,        // everyone else hidden
  subject,
  html,
});
    } catch (e: any) {
      console.error("Resend send error:", e?.message || e);
    }
  }
  return true;
}

export async function sendNewsletter(
  draft: NewsletterDraft,
  opts?: { recipients?: string[] }
) {
  // If recipients are provided, use ONLY them; otherwise use the subscriber list.
  const override = cleanEmails(opts?.recipients || []);
  const to =
    override.length > 0
      ? override
      : (await listSubscribers((draft as any)?.audienceTag)).map((s) => s.email).filter(Boolean);

  const recipients = cleanEmails(to);
  if (!recipients.length) {
    console.log(`[newsletter] No recipients. Subject "${draft.subject}"`);
    return { sent: 0 };
  }

  const subject = draft.subject?.trim() || "Newsletter";
  const html = mdToBasicHtml(draft.markdown);
  const text = mdToText(draft.markdown);

  const ok = await sendWithResend(recipients, subject, html, text);
  if (!ok) {
    console.log(
      `[newsletter] No email provider configured. Would send "${subject}" to ${recipients.length} recipient(s).`
    );
  } else {
    console.log(`[newsletter] Sent "${subject}" to ${recipients.length} recipient(s) via BCC`);
  }
  return { sent: recipients.length };
}
