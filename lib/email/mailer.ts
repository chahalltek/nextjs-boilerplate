// lib/email/mailer.ts
type SendArgs = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  headers?: Record<string, string>;
};

/**
 * Minimal Resend HTTP mailer (no SDK).
 * Required env:
 *   RESEND_API_KEY   = re_xxx...
 *   RESEND_FROM      = "Lineup Lab <onboarding@resend.dev>"  // use onboarding@resend.dev until your domain is verified
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from,
  headers = {},
}: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const API_KEY = (process.env.RESEND_API_KEY || "").trim();
  const FROM = (from || process.env.RESEND_FROM || "onboarding@resend.dev").trim();

  if (!API_KEY) return { ok: false, error: "RESEND_API_KEY missing" };
  if (!FROM) return { ok: false, error: "RESEND_FROM missing" };

  // Resend requires at least one of html/text
  if (!html && !text) text = "(empty message)";

  const body = {
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    headers,
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      // Resend responds with { message: "..." } on errors
      const msg = data?.message || `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, id: data?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export function isEmailConfigured() {
  return Boolean((process.env.RESEND_API_KEY || "").trim() && (process.env.RESEND_FROM || "").trim());
}
