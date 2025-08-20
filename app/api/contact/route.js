// app/api/contact/route.js
import { NextResponse } from "next/server";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";

export const runtime = "nodejs"; // mailers need Node runtime

const ok = (data = {}) => NextResponse.json({ ok: true, ...data });
const err = (message, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });

export async function GET(req) {
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

export async function POST(req) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const body = (await req.json().catch(() => ({}))) || {};

    // Honeypot (bot trap)
    if (body.company && String(body.company).trim()) return ok({ skipped: true });

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const reason = String(body.reason || "").trim();
    const message = String(body.message || "").trim();
    const subject =
      String(body.subject || "").trim() ||
      `New contact message${name ? ` from ${name}` : ""}${
        reason ? ` — ${reason}` : ""
      }`;

    if (!email) return err("Email is required.");
    if (message.length < 5) return err("Message is too short.");
    if (message.length > 5000) return err("Message is too long.");

    const TO =
      process.env.CONTACT_TO ||
      process.env.SUPPORT_INBOX ||
      process.env.ADMIN_EMAIL;

    if (!TO) return err("CONTACT_TO (or SUPPORT_INBOX/ADMIN_EMAIL) not set.", 500);
    if (!isEmailConfigured())
      return err("RESEND_API_KEY / RESEND_FROM not configured.", 500);

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
      headers: { "Reply-To": email },
    });

    if (!res.ok) return err(res.error || "Email send failed", 502);
    return ok({ id: res.id });
  } catch (e) {
    console.error("[contact] unexpected error:", e);
    return err(e?.message || "Unexpected server error", 500);
  }
}

/* ---------------- utils ---------------- */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function maskEmail(e = "") {
  const [u = "", d = ""] = String(e).split("@");
  return `${u.slice(0, 2)}***@${d}`;
}
