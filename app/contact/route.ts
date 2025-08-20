// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/mailer"; // your existing mailer wrapper
export const runtime = "nodejs"; // IMPORTANT: mailers need Node

type Body = {
  name?: string;
  email?: string;
  subject?: string;
  reason?: string; // optional select field
  message?: string;
  company?: string; // honeypot
};

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
const bad = (msg: string, status = 400) => json({ ok: false, error: msg }, status);

// ---------- GET: lightweight health check ----------
// /api/contact            -> { ok:true, node:true, hasFrom/hasTo }
// /api/contact?echo=1     -> also echoes non-secret config (masked)
// (no secrets are exposed)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const echo = url.searchParams.get("echo") === "1";

  const FROM = process.env.CONTACT_FROM || process.env.EMAIL_FROM || "";
  const TO = process.env.CONTACT_TO || process.env.EMAIL_TO || "";

  return json({
    ok: true,
    node: true,
    hasFrom: Boolean(FROM),
    hasTo: Boolean(TO),
    ...(echo
      ? {
          fromPreview: maskEmail(FROM),
          toPreview: maskEmail(TO),
          mailer: "sendEmail()" // confirms integration point
        }
      : {})
  });
}

// ---------- POST: send the message ----------
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    const b = (await req.json().catch(() => ({}))) as Body;

    // Honeypot
    if (b.company && b.company.trim()) {
      // Silently succeed for bots
      return json({ ok: true, skipped: true });
    }

    const name = (b.name || "").trim();
    const email = (b.email || "").trim();
    const reason = (b.reason || "").trim();
    const message = (b.message || "").trim();
    const subject =
      (b.subject || "").trim() ||
      `New contact form message${name ? ` from ${name}` : ""}${reason ? ` — ${reason}` : ""}`;

    if (!email || !message) return bad("Email and message are required.");
    if (message.length < 5) return bad("Message is too short.");
    if (message.length > 5000) return bad("Message is too long.");

    const TO = process.env.CONTACT_TO || process.env.EMAIL_TO;
    const FROM = process.env.CONTACT_FROM || process.env.EMAIL_FROM;

    if (!TO || !FROM) {
      console.error("[contact] Missing CONTACT_TO/CONTACT_FROM env vars.");
      return bad("Server email is not configured (CONTACT_TO/CONTACT_FROM).", 500);
    }

    const text = [
      `From: ${name || "Anonymous"} <${email}>`,
      reason ? `Reason: ${reason}` : "",
      `Subject: ${subject}`,
      "",
      message,
    ].filter(Boolean).join("\n");

    const html = `
      <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
        <p><strong>From:</strong> ${name ? `${escapeHtml(name)} ` : ""}&lt;${escapeHtml(email)}&gt;</p>
        ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ""}
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr />
        <pre style="white-space:pre-wrap;font:inherit;margin:0">${escapeHtml(message)}</pre>
      </div>
    `;

    if (dryRun) {
      console.log("[contact] DRY RUN — would send:", { TO, FROM, subject, replyTo: email });
      return json({ ok: true, dryRun: true });
    }

    await sendEmail({
      to: TO,
      from: FROM,
      subject,
      text,
      html,
      headers: { "Reply-To": email }, // so you can just reply in your inbox
    });

    return json({ ok: true });
  } catch (err: any) {
    // Surface a helpful provider error if present
    const hint =
      err?.message ||
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Unexpected server error";
    console.error("[contact] POST failed:", err);
    return bad(hint, 500);
  }
}

// ---------- utils ----------
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
  const [u, d] = e.split("@");
  return `${u?.slice(0, 2) || ""}***@${d || ""}`;
}
