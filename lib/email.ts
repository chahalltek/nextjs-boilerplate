// lib/email.ts

type SendOpts = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Sends an email via Resend.
 * - If RESEND_API_KEY is missing or the 'resend' package isn't installed,
 *   it logs and safely no-ops so builds/crons don't fail.
 */
export async function sendRosterEmail(opts: SendOpts) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return { ok: false, skipped: true as const };
  }

  // Lazy import so the app can build even if 'resend' isn't installed yet.
  let ResendCtor: any;
  try {
    ({ Resend: ResendCtor } = await import("resend"));
  } catch {
    console.warn("[email] 'resend' package not installed — skipping send");
    return { ok: false, skipped: true as const };
  }

  const resend = new ResendCtor(apiKey);

  // Support either EMAIL_FROM or legacy FROM_EMAIL
  const from =
    process.env.EMAIL_FROM ||
    process.env.FROM_EMAIL ||
    "Skol Coach <noreply@theskolsisters.com>";

  try {
    const res = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      reply_to: process.env.EMAIL_REPLY_TO,
    });
    return { ok: true, id: (res as any)?.id };
  } catch (e: any) {
    console.error("[email] send failed:", e?.message || e);
    return { ok: false, error: e?.message };
  }
}
