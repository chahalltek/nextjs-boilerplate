import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendRosterEmail(opts: {
  to: string; subject: string; html: string;
}) {
  const from = process.env.FROM_EMAIL || "Skol Coach <noreply@yourdomain>";
  if (!opts.to) return;
  try {
    await resend.emails.send({
      from, to: opts.to, subject: opts.subject, html: opts.html,
    });
  } catch (e) {
    console.error("Email error", e);
  }
}
