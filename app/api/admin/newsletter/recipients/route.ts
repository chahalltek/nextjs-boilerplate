// app/api/admin/newsletter/recipients/route.ts
import { NextResponse } from "next/server";

// (your existing helper functions to gather recipients)
// ... getRecipientsFromMailchimp(), getRecipientsFromKV(), etc.

export async function GET(req: Request) {
  const url = new URL(req.url);

  // --- Route-level key validation ---
  const expected = (process.env.ADMIN_API_KEY || "").trim();
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const xkey = req.headers.get("x-admin-key")?.trim();
  const provided = bearer || xkey || "";

  if (!expected) {
    // Safer to fail closed if the key isn't configured
    return NextResponse.json(
      { error: "unauthorized", reason: "ADMIN_API_KEY not set in this environment" },
      { status: 401 }
    );
  }
  if (!provided) {
    return NextResponse.json(
      { error: "unauthorized", reason: "missing Authorization Bearer or X-Admin-Key header" },
      { status: 401 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json(
      { error: "unauthorized", reason: "bad key" },
      { status: 401 }
    );
  }

  // --- Your existing logic below ---
  const email = url.searchParams.get("email") || "";
  // TODO: replace with your real recipient sources
  // const recipients = await getRecipientsFromMailchimpAndKV();
  const recipients = []; // placeholder

  if (email) {
    const lower = email.toLowerCase();
    const found = recipients.find((r: any) => (r.email || "").toLowerCase() === lower);
    return NextResponse.json({ ok: true, match: found || null });
  }

  return NextResponse.json({ ok: true, count: recipients.length, recipients });
}
