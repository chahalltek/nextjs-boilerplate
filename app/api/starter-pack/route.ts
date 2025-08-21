import { NextResponse } from "next/server";
import { Resend } from "resend";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use a verified sender on your Resend account for real delivery.
const FROM = process.env.EMAIL_FROM || "Hey Skol Sister <onboarding@resend.dev>";

// Where to read the PDF from (repo path) and where to link to it (public URL)
const FILE_PATH =
  process.env.STARTER_PACK_FILE || path.resolve(process.cwd(), "public", "starter-pack.pdf");

const DOWNLOAD_URL =
  process.env.STARTER_PACK_URL ||
  `${process.env.NEXT_PUBLIC_SITE_URL || ""}/starter-pack.pdf`;

function isEmail(v: string) {
  return /\S+@\S+\.\S+/.test(v);
}

export async function POST(req: Request) {
  try {
    const { email, tag, source } = await req.json();

    if (!email || !isEmail(email)) {
      return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
    }

    // Best-effort: forward to your subscribe endpoint (doesn't block email send)
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || "";
      if (base) {
        await fetch(new URL("/api/subscribe", base), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, tag, source }),
        });
      }
    } catch (e) {
      console.warn("[starter-pack] subscribe forwarding failed:", e);
    }

    // Read the PDF from disk so we can attach it
    let pdf: Buffer;
    try {
      pdf = await fs.readFile(FILE_PATH);
    } catch (e) {
      console.error("[starter-pack] Could not read PDF at", FILE_PATH, e);
      return NextResponse.json(
        { ok: false, error: "Starter Pack file missing on server." },
        { status: 500 }
      );
    }

    // Send email with attachment + a fallback download link in the body
    const { error, data } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Your Hey Skol Sister Starter Pack 🎉",
      reply_to: "hello@heyskolsister.com", // optional, use your support inbox
      text: `Thanks for listening! Your PDF is attached.\n\nIf you prefer a link: ${DOWNLOAD_URL}`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
          <h2>Here’s your Starter Pack 🎉</h2>
          <p>Thanks for listening! Your PDF is attached to this email.</p>
          <p>
            Prefer a link? Click below to download:
          </p>
          <p>
            <a href="${DOWNLOAD_URL}"
               style="display:inline-block;padding:12px 16px;background:#FDB927;color:#000;
                      text-decoration:none;border-radius:10px;font-weight:600">
              Download the Starter Pack
            </a>
          </p>
          <p style="font-size:13px;color:#555">
            If the button doesn’t work, copy this link:<br/>
            <span>${DOWNLOAD_URL}</span>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: "Hey-Skol-Sister-Starter-Pack.pdf",
          content: pdf, // Buffer is fine; Resend will handle the encoding
        },
      ],
    });

    if (error) {
      console.error("[Resend] send error:", error);
      return NextResponse.json(
        { ok: false, error: "Could not send email. Please try again." },
        { status: 500 }
      );
    }

    console.log("[Resend] email sent id:", data?.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("starter-pack POST error:", err);
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
}
