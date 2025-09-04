// app/api/admin/newsletter/recipients/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Recipient {
  email: string;
  source?: "mailchimp" | "kv" | "custom";
  status?: string;
  id?: string;
  [key: string]: any;
}

function getProvidedAdminKey(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const xkey = req.headers.get("x-admin-key")?.trim();
  return bearer || xkey || "";
}

export async function GET(req: Request) {
  // --- Route-level admin key validation ---
  const expected = (process.env.ADMIN_API_KEY || "").trim();
  const provided = getProvidedAdminKey(req);

  if (!expected) {
    return NextResponse.json(
      { error: "unauthorized", reason: "ADMIN_API_KEY not set in this environment" },
      { status: 401 }
    );
  }
  if (!provided) {
    return NextResponse.json(
      { error: "unauthorized", reason: "missing Authorization: Bearer or X-Admin-Key header" },
      { status: 401 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json(
      { error: "unauthorized", reason: "bad key" },
      { status: 401 }
    );
  }

  // --- Query handling ---
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").toLowerCase();

  // TODO: Plug in Mailchimp + KV lookups here.
  // Example shape: [{ email: "user@example.com", source: "mailchimp", status: "subscribed", id: "abc123" }]
  const recipients: Recipient[] = [];

  if (email) {
    const match =
      recipients.find((r) => (r.email || "").toLowerCase() === email) || null;
    return NextResponse.json({ ok: true, match });
  }

  return NextResponse.json({ ok: true, count: recipients.length, recipients });
}
