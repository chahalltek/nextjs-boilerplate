// lib/email/mailer.ts
import { Resend } from "resend";

type SendArgs = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  headers?: Record<string, string>;
};

export async function sendEmail({
  to,
  subject,
  text,
  html,
  from,
  headers = {},
}: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const API_KEY = process.env.RESEND_API_KEY;
  const FROM = from || process.env.RESEND_FROM || "onboarding@resend.dev";

  if (!API_KEY) {
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  try {
    const resend = new Resend(API_KEY);
    const result = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
      headers,
    });

    if (result.error) {
      // Resend SDK gives a structured error
      const msg =
        (result.error as any)?.message ||
        (typeof result.error === "string" ? result.error : "Unknown send error");
      return { ok: false, error: msg };
    }

    return { ok: true, id: result.data?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Quick config probe (does NOT validate the key with Resend) */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.RESEND_FROM || "onboarding@resend.dev"));
}
