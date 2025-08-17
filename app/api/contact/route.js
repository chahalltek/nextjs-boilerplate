import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req) {
  try {
    const { name = "", email = "", reason = "", message = "" } = await req.json();

    if (!email || !message) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Email service not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "admin@heyskolsister.com",
        to: ["admin@heyskolsister.com"],
        reply_to: email,
        subject: `Contact form: ${reason || "No reason specified"}`,
        text: `Name: ${name}\nEmail: ${email}\nReason: ${reason}\n\n${message}`,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ ok: false, error: txt || "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}