// lib/newsletter/send.ts
import { Resend } from "resend";
import type { NewsletterDraft } from "@/lib/newsletter/store";
import { renderNewsletterEmail } from "./template";

const RESEND_KEY   = process.env.RESEND_API_KEY || "";
const FROM         = process.env.RESEND_FROM || "Hey Skol Sister <no-reply@heyskolsister.com>";
const REPLY_TO     = process.env.RESEND_REPLY_TO || undefined;
const BATCH_SIZE   = Math.max(1, Number(process.env.RESEND_BCC_BATCH_SIZE || 50));
const LIST_EMAIL   = process.env.LIST_EMAIL || "unsubscribe@heyskolsister.com"; // optional

export type SendOpts = { recipients?: string[]; audienceTag?: string };
export type SendResult = {
  ok: boolean;
  delivered: number;
  failed: number;
  errors: string[];
  id?: string; // first message id if available
};

function toText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanRecipients(input: string[]) {
  const seen = new Set<string>();
  return input
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.includes("@"))
    .filter((s) => {
      const low = s.toLowerCase();
      if (seen.has(low)) return false;
      seen.add(low);
      return true;
    });
}

export async function sendNewsletter(
  draft: NewsletterDraft,
  opts: SendOpts = {}
): Promise<SendResult> {
  if (!RESEND_KEY) {
    return { ok: false, delivered: 0, failed: 0, errors: ["Missing RESEND_API_KEY"] };
  }

  const resend = new Resend(RESEND_KEY);
  const html = renderNewsletterEmail(draft);   // includes logo + nav links
  const text = toText(html);

  // For admin “test send”, we expect explicit recipients.
  const recipients = cleanRecipients(opts.recipients || []);
  if (recipients.length === 0) {
    return { ok: false, delivered: 0, failed: 0, errors: ["No recipients"] };
  }

  let delivered = 0;
  let failed = 0;
  const errors: string[] = [];
  let firstId: string | undefined;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const to = [batch[0]];       // visible “To”
    const bcc = batch.slice(1);  // rest BCC

    try {
      const res = await resend.emails.send({
        from: FROM,
        to,
        ...(bcc.length ? { bcc } : {}),
        subject: draft.subject || "Hey Skol Sister",
        html,
        text,
        replyTo: REPLY_TO, // correct key for SDK
        headers: {
          ...(LIST_EMAIL ? { "List-Unsubscribe": `<mailto:${LIST_EMAIL}>` } : {}),
          "X-Entity-Ref-ID": draft.id,
        },
        tags: [
          { name: "app", value: "heyskolsister" },
          { name: "kind", value: "newsletter" },
          ...(draft.audienceTag ? [{ name: "audience", value: String(draft.audienceTag) }] : []),
        ],
      });

      // New SDK shape: { data, error }
      if (res.error) {
        failed += batch.length;
        errors.push(res.error.message || "Resend error");
      } else if (res.data?.id) {
        if (!firstId) firstId = res.data.id;
        delivered += batch.length;
      } else {
        failed += batch.length;
        errors.push("Resend: no message id returned");
      }
    } catch (e: any) {
      failed += batch.length;
      errors.push(e?.message || String(e));
    }
  }

  return { ok: delivered > 0 && errors.length === 0, delivered, failed, errors, id: firstId };
}
