// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";

export const runtime = "nodejs"; // mailers require Node, not Edge

type Body = {
  name?: string;
  email?: string;
  subject?: string;
  reason?: string;
  message?: string;
  company?: string; // honeypot
};

const ok = (data: any = {}) => NextResponse.json({ ok: true, ...data });
const err = (message: string, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });

/**
 * GET /api/contact
 * - Quick health check for config
 * - /api/contact?echo=1 will return masked env previews
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const echo = url.searchParams.get("echo") === "1";

  const TO =
    process.env.CONTACT_TO ||
    process.env.SUPPORT_INBOX ||
    process.env.ADMIN_EMAIL ||
    "";

  return ok({
    node: true,
    hasMailer: isEmailConfigured(),
    hasInbox: Boolean(TO),
    ...(echo
      ? {
          fromPreview: maskEmail(process.env.RESEND_FROM || ""),
          toPreview: maskEmail(TO),
        }
      : {}),
  });
}

/**
 * POST /api/contact
 * Body: { name, email, reason, subject?, message, company? }
 * Query: dryRun=1 (optional) to test without sending
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    const body = (await req.json().catch(() => ({}))) as Body;

    // Honeypot — if filled, silently succeed
    if (body.company && body.company.trim()) return ok({ skipped: true });

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const reason = (body.reason || "").trim();
    const message = (body.message || "").trim();
    const subject =
      (body.subject || "").trim() ||
      `New contact message${name ? ` from ${name}` : ""}${
        reason ? ` — ${reason}` : ""
      }`;

    if (!email) return err("Email is required.");
    if (!message || message.length < 5) return err("Message is too short.");
    if (message.length > 5000) return err("Message is too long.");

    // Where to send incoming contact messages
    const TO =
      process.env.CONTACT_TO ||
      process.env.SUPPORT_INBOX ||
      process.env.ADMIN_EMAIL;

    if (!TO) {
      return err(
        "Server inbox not configured. Set CONTACT_TO (or SUPPORT_INBOX / ADMIN_EMAIL) in env.",
        500
      );
    }
    if (!isEmailConfigured()) {
      return err(
        "Email provider not configured. Set RESEND_API_KEY and RESEND_FROM.",
        500
      );
    }

    const text = [
      `From: ${name || "Anonymous"} <${email}>`,
      reason ? `Reason: ${reason}` : "",
      `Subject: ${subject}`,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
        <p><strong>From:</strong> ${escapeHtml(name || "Anonymous")} &lt;${escapeHtml(
      email
    )}&gt;</p>
        ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ""}
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr />
        <pre style="white-space:pre-wrap;margin:0;font:inherit">${escapeHtml(
          message
        )}</pre>
      </div>`;

    if (dryRun) return ok({ dryRun: true });

    const res = await sendEmail({
      to: TO,
      subject,
      text,
      html,
      headers: { "Reply-To": email }, // reply from your inbox hits the user
    });

    if (!res.ok) return err(res.error || "Email send failed", 502);

    return ok({ id: res.id });
  } catch (e: any) {
    console.error("[contact] unexpected error:", e);
    return err(e?.message || "Unexpected server error", 500);
  }
}

/* ---------------- utils ---------------- */

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function maskEmail(e?: string) {
  if (!e) return "";
  const [u = "", d = ""] = e.split("@");
  return `${u.slice(0, 2)}***@${d}`;
}
