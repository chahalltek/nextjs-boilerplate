// lib/newsletter/send.ts
import { Resend } from "resend";
import type { NewsletterDraft } from "@/lib/newsletter/store";
import { renderNewsletterEmail } from "./template";

/** ENV — make sure these are set on Vercel */
const RESEND_KEY   = process.env.RESEND_API_KEY;
const FROM         = process.env.RESEND_FROM || "Hey Skol Sister <no-reply@heyskolsister.com>";
const REPLY_TO     = process.env.RESEND_REPLY_TO || undefined;
/** Used only if you wire bulk sends later */
const BATCH_SIZE   = Number(process.env.RESEND_BCC_BATCH_SIZE || 50);

type SendOpts = {
  /** If provided, we treat this as a TEST send and put everyone in the visible "to" field */
  recipients?: string[];
  /** (future) segment, not used in this test path */
  audienceTag?: string;
};

export type SendResult = {
  ok: boolean;
  delivered: number;
  failed: number;
  /** Resend message id (present for single API call paths) */
  id?: string;
  /** Provider / API error messages, if any */
  errors: string[];
};

export async function sendNewsletter(
  draft: NewsletterDraft,
  opts: SendOpts = {}
): Promise<SendResult> {
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY is not configured");
  if (!FROM) throw new Error("RESEND_FROM is not configured");

  const resend = new Resend(RESEND_KEY);

  // Build HTML (already includes your logo + nav links) and a simple text fallback
  const html = renderNewsletterEmail(draft);
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const errors: string[] = [];
  let delivered = 0;
  let failed = 0;
  let id: string | undefined;

  const recipients = (opts.recipients || []).filter(Boolean);

  // ---------- TEST PATH: send to all recipients in the visible "to" ----------
  if (recipients.length > 0) {
    try {
      const res = await resend.emails.send({
        from: FROM,
        to: recipients, // <— visible To for better deliverability on tests
        subject: draft.subject || "Hey Skol Sister",
        html,
        text,
        reply_to: REPLY_TO,
        headers: {
          // Nice to have for spam filters and compliance
          "List-Unsubscribe":
            "<mailto:unsubscribe@heyskolsister.com>, <https://heyskolsister.com/unsubscribe>",
        },
        tags: [{ name: "type", value: "newsletter-test" }],
      });

      // Resend SDK can be { data: { id }, error } on newer versions
      const providerErr = (res as any)?.error;
      id = (res as any)?.id || (res as any)?.data?.id;

      if (providerErr) {
        errors.push(providerErr.message || String(providerErr));
        failed += recipients.length;
      } else if (id) {
        delivered += recipients.length;
      } else {
        errors.push("Provider returned no message id");
        failed += recipients.length;
      }
    } catch (e: any) {
      errors.push(e?.message || String(e));
      failed += recipients.length;
    }

    return { ok: errors.length === 0, delivered, failed, id, errors };
  }

  // ---------- (Optional) BULK PATH: keep BCC batching if you wire an audience later ----------
  // NOTE: Right now the admin “Send now” path isn’t using this. If you later provide an
  // audience list here, keep the first recipient in "to" and the rest in "bcc" per batch.
  errors.push("No recipients provided");
  return { ok: false, delivered: 0, failed: 0, id, errors };
}
