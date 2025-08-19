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
 * Minimal mailer using Resend's HTTP API (no SDK).
 * Configure:
 * - RESEND_API_KEY=<your key>
 * - RESEND_FROM="Lineup Lab <noreply@yourdomain.com>"
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from,
  headers = {},
}: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const API_KEY = process.env.RESEND_API_KEY;
  const FROM = from || process.env.RESEND_FROM || "Lineup Lab <noreply@example.com>";

  if (!API_KEY) {
    console.warn("[mailer] RESEND_API_KEY missing — email send is a no-op");
    return { ok: true, id: "DEV-NOOP" };
  }

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
      const msg = data?.message || `HTTP ${res.status}`;
      console.error("[mailer] send failed:", msg, data);
      return { ok: false, error: msg };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error("[mailer] send error:", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Small helper if you want to gate features on config availability */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}
