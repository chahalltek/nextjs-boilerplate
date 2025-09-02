// lib/newsletter/send.ts
import type { NewsletterDraft } from "./store";
import { listSubscribers } from "@/lib/subscribers/store";

/** Minimal Markdown → HTML for email. Preserves blank lines and lists. */
function mdToBasicHtml(md: string) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.replace(/\r/g, "").split("\n");

  // very small inline markup: **bold**, _italics_, links [t](u)
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  const out: string[] = [];
  let inUl = false;
  const closeUl = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  };

  for (const raw of lines) {
    const l = raw.trimEnd();

    if (/^#\s+/.test(l)) { closeUl(); out.push(`<h1>${inline(l.replace(/^#\s+/, ""))}</h1>`); continue; }
    if (/^##\s+/.test(l)) { closeUl(); out.push(`<h2>${inline(l.replace(/^##\s+/, ""))}</h2>`); continue; }
    if (/^###\s+/.test(l)) { closeUl(); out.push(`<h3>${inline(l.replace(/^###\s+/, ""))}</h3>`); continue; }

    if (/^[-*]\s+/.test(l)) {
      if (!inUl) { out.push('<ul style="margin:0 0 1em 1.25em; padding:0;">'); inUl = true; }
      out.push(`<li>${inline(l.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (!l.trim()) { closeUl(); out.push("<br/>"); continue; }

    closeUl();
    out.push(`<p>${inline(l)}</p>`);
  }
  closeUl();
  return out.join("\n");
}

/** Optional chrome for every email (logo + nav). Call with already-rendered body HTML. */
function wrapEmailHtml(bodyHtml: string, subject: string) {
  const logoUrl = "https://heyskolsister.com/brand/logo-email.png"; // put a small (<=100KB) hosted logo
  return `<!doctype html>
<html>
<head>
  <meta charSet="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0; background:#0f0d18; font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Helvetica,Arial,sans-serif; color:#fff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0d18; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%; background:#15122a; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:20px 24px; text-align:center; background:#1b1736;">
              <a href="https://heyskolsister.com" style="text-decoration:none;">
                <img alt="Hey Skol Sister" src="${logoUrl}" width="160" style="display:inline-block; height:auto; border:0; outline:none; text-decoration:none;" />
              </a>
              <div style="margin-top:12px;">
                <a href="https://heyskolsister.com/stats" style="color:#f2c14e; text-decoration:none; margin:0 10px;">Player Projections</a>
                <a href="https://heyskolsister.com/start-sit" style="color:#f2c14e; text-decoration:none; margin:0 10px;">Sit/Start</a>
                <a href="https://heyskolsister.com/blog" style="color:#f2c14e; text-decoration:none; margin:0 10px;">Blog</a>
                <a href="https://heyskolsister.com/roster" style="color:#f2c14e; text-decoration:none; margin:0 10px;">Lineup Lab</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px; font-size:12px; color:#cfcce6; background:#1b1736;">
              You’re receiving this because you subscribed to Hey Skol Sister.
              <br/>Don’t want these? Unsubscribe from your profile or reply and we’ll remove you.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

type SendResult = { ok: boolean; delivered: number; failed: number; errors: string[] };

async function sendWithResend(
  recipients: string[],
  subject: string,
  html: string,
  opts?: { bccMode?: boolean } // true for bulk sends; false for tests
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY || "";
  const fromAddr = process.env.NEWSLETTER_FROM || "Skol Sisters <news@heyskolsister.com>";

  if (!key) {
    return { ok: false, delivered: 0, failed: recipients.length, errors: ["RESEND_API_KEY is missing"] };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(key);

  const chunk = <T,>(arr: T[], n = 50) =>
    arr.reduce<T[][]>((a, c, i) => {
      const k = Math.floor(i / n);
      (a[k] ||= []).push(c);
      return a;
    }, []);

  const batches = chunk(recipients, 50);
  let delivered = 0;
  const errors: string[] = [];

  for (const batch of batches) {
    try {
      if (opts?.bccMode) {
        // bulk: one visible "To" (sender) + everyone in BCC (hidden)
        await resend.emails.send({
          from: fromAddr,
          to: [fromAddr],
          bcc: batch,
          subject,
          html,
        });
        delivered += batch.length;
      } else {
        // tests: send directly to each batch "To" so deliverability is clearer
        await resend.emails.send({
          from: fromAddr,
          to: batch,
          subject,
          html,
        });
        delivered += batch.length;
      }
    } catch (e: any) {
      errors.push(e?.message || String(e));
    }
  }

  return {
    ok: delivered > 0 && errors.length === 0,
    delivered,
    failed: recipients.length - delivered,
    errors,
  };
}

export async function sendNewsletter(
  draft: NewsletterDraft,
  opts?: { recipients?: string[] }
): Promise<SendResult> {
  // If recipients are provided, use ONLY them (test mode). Otherwise, use subscriber list.
  const override = cleanEmails(opts?.recipients || []);
  const to =
    override.length > 0
      ? override
      : (await listSubscribers((draft as any as string | undefined)))
          .map((s) => s.email)
          .filter(Boolean);

  if (!to.length) {
    console.log(`[newsletter] No recipients. Subject "${draft.subject}"`);
    return { ok: false, delivered: 0, failed: 0, errors: ["No recipients"] };
  }

  const body = mdToBasicHtml(draft.markdown || "");
  const html = wrapEmailHtml(body, draft.subject || "Hey Skol Sister");

  const result = await sendWithResend(
    to,
    draft.subject || "Hey Skol Sister",
    html,
    { bccMode: override.length === 0 } // bulk=bcc; tests=direct
  );

  if (!result.ok) {
    console.error("[newsletter] send failed", result);
  } else {
    console.log(`[newsletter] Sent "${draft.subject}" to ${result.delivered}/${to.length} recipient(s)`);
  }

  return result;
}
