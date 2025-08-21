import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "Hey Skol Sister <onboarding@resend.dev>";
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

    // (Optional) Try to register the subscriber using your existing endpoint.
    // Failures here won't block the email.
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

    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Your Hey Skol Sister Starter Pack 🎉",
      text: `Here’s your download link: ${DOWNLOAD_URL}\nThis link never expires.`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
          <h2>Here’s your Starter Pack 🎉</h2>
          <p>Thanks for listening! Click below to download the PDF.</p>
          <p>
            <a href="${DOWNLOAD_URL}"
               style="display:inline-block;padding:12px 16px;background:#FDB927;color:#000;
                      text-decoration:none;border-radius:10px;font-weight:600">
              Download the Starter Pack
            </a>
          </p>
          <p style="font-size:13px;color:#555">
            If the button doesn’t work, copy this link:<br>
            <span>${DOWNLOAD_URL}</span>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] send error:", error);
      return NextResponse.json({ ok: false, error: "Could not send email. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("starter-pack POST error:", err);
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
}
