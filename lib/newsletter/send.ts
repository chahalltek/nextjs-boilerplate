// lib/newsletter/send.ts
import { Resend } from "resend";
import type { NewsletterDraft } from "@/lib/newsletter/store";
import { renderNewsletterEmail } from "./template"; // whatever you're using

const RESEND_KEY  = process.env.RESEND_API_KEY!;
const FROM        = process.env.RESEND_FROM || "Hey Skol Sister <no-reply@heyskolsister.com>";
const BATCH_SIZE  = Number(process.env.RESEND_BCC_BATCH_SIZE || 50);

type SendOpts = { recipients?: string[]; audienceTag?: string };
type SendResult = { ok: boolean; delivered: number; failed: number; errors: string[] };

export async function sendNewsletter(
  draft: NewsletterDraft,
  opts: SendOpts = {}
): Promise<SendResult> {
  const resend = new Resend(RESEND_KEY);
  const html = renderNewsletterEmail(draft);       // includes logo + nav links
  const text = html.replace(/<[^>]+>/g, " ");      // simple fallback

  const recipients = (opts.recipients || []).filter(Boolean);
  if (recipients.length === 0) {
    return { ok: false, delivered: 0, failed: 0, errors: ["No recipients"] };
  }

  let delivered = 0;
  let failed = 0;
  const errors: string[] = [];

  // chunk into batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const to  = [batch[0]];           // visible "to"
    const bcc = batch.slice(1);       // rest hidden

    try {
      const res = await resend.emails.send({
        from: FROM,
        to,
        ...(bcc.length ? { bcc } : {}),
        subject: draft.subject || "Hey Skol Sister",
        html,
        text,
        reply_to: process.env.RESEND_REPLY_TO || undefined,
      });

      // Resend returns an id on success
      if (res?.id) {
        delivered += batch.length;
      } else {
        failed += batch.length;
        errors.push("No message id returned");
      }
    } catch (e: any) {
      failed += batch.length;
      errors.push(String(e?.message || e));
    }
  }

  return { ok: delivered > 0, delivered, failed, errors };
}
