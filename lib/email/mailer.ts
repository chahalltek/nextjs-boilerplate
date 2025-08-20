// lib/email/mailer.ts
type SendArgs = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string; // e.g. 'Lineup Lab <noreply@heyskolsister.com>'
  headers?: Record<string, string>;
};

/**
 * Provider-agnostic mailer.
 * - If RESEND_API_KEY is present, uses Resend (https://resend.com)
 * - Else if MANDRILL_API_KEY is present, uses Mailchimp Transactional (Mandrill)
 * - Else returns a DEV no-op response
 *
 * Also set a from address on your verified sending domain:
 *   RESEND_FROM="Lineup Lab <noreply@heyskolsister.com>"
 *   or
 *   MAIL_FROM="Lineup Lab <noreply@heyskolsister.com>"
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from,
  headers = {},
}: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasMandrill = Boolean(process.env.MANDRILL_API_KEY);

  if (hasResend) {
    return sendViaResend({ to, subject, text, html, from, headers });
  }
  if (hasMandrill) {
    return sendViaMandrill({ to, subject, text, html, from, headers });
  }

  // Dev fallback: don't throw, just log and succeed so the app flows
  console.warn("[mailer] No provider configured — returning no-op success");
  return { ok: true, id: "DEV-NOOP" };
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.MANDRILL_API_KEY);
}

/* -------------------- Providers -------------------- */

async function sendViaResend(args: SendArgs) {
  const API_KEY = process.env.RESEND_API_KEY!;
  const FROM =
    args.from ||
    process.env.RESEND_FROM ||
    process.env.MAIL_FROM ||
    "Lineup Lab <noreply@example.com>";

  const body = {
    from: FROM,
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
    text: args.text,
    html: args.html,
    headers: args.headers || {},
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
      console.error("[mailer:resend] send failed:", msg, data);
      return { ok: false, error: msg };
    }
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error("[mailer:resend] error:", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

async function sendViaMandrill(args: SendArgs) {
  const API_KEY = process.env.MANDRILL_API_KEY!;
  const fromParsed = parseFrom(
    args.from || process.env.MAIL_FROM || "Lineup Lab <noreply@example.com>"
  );

  // Mandrill expects: to: [{ email, name?, type: "to" }]
  const toArray = (Array.isArray(args.to) ? args.to : [args.to]).map((email) => ({
    email,
    type: "to" as const,
  }));

  const body = {
    key: API_KEY,
    message: {
      from_email: fromParsed.email,
      from_name: fromParsed.name,
      to: toArray,
      subject: args.subject,
      text: args.text,
      html: args.html,
      headers: args.headers || {},
      // optional flags:
      // important: false,
      // track_opens: true,
      // track_clicks: true,
      // auto_text: true,
    },
  };

  try {
    const res = await fetch("https://mandrillapp.com/api/1.0/messages/send.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      const msg = data?.message || `HTTP ${res.status}`;
      console.error("[mailer:mandrill] send failed:", msg, data);
      return { ok: false, error: msg };
    }

    // Mandrill returns an array of results; grab first id/status
    const first = Array.isArray(data) ? data[0] : undefined;
    const status = first?.status;
    const id = first?._id || first?.id;

    if (status && status !== "sent" && status !== "queued") {
      console.error("[mailer:mandrill] non-sent status:", status, data);
      return { ok: false, error: `status=${status}` };
    }

    return { ok: true, id };
  } catch (err: any) {
    console.error("[mailer:mandrill] error:", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/* -------------------- Utils -------------------- */

function parseFrom(input: string) {
  // Accept "Name <email@domain.com>" or just "email@domain.com"
  const m = input.match(/^(.*)<(.+@.+)>$/);
  if (m) {
    const name = m[1].trim().replace(/^"|"$|^'|'$/g, "") || undefined;
    const email = m[2].trim();
    return { email, name };
  }
  return { email: input.trim(), name: undefined };
}
