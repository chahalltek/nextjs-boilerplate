// app/api/admin/newsletter/recipients/route.ts
import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

/** Simple Bearer check so you can curl this endpoint */
function adminBearerOk(req: Request) {
  const token = process.env.ADMIN_API_KEY || "";
  if (!token) return false;
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") && h.slice(7) === token;
}

function jsonOrText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

/** Mailchimp member look-up by email */
async function getMailchimpMember(email: string) {
  const API_KEY  = need("MAILCHIMP_API_KEY");
  const PREFIX   = need("MAILCHIMP_SERVER_PREFIX"); // e.g. us21
  const LIST_ID  = need("MAILCHIMP_LIST_ID");

  const lower = email.trim().toLowerCase();
  const hash  = createHash("md5").update(lower).digest("hex");

  const url = `https://${PREFIX}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${hash}`;
  const auth = "Basic " + Buffer.from(`anystring:${API_KEY}`).toString("base64");

  const res  = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, detail: jsonOrText(text) };
  }

  const data = jsonOrText(text) as any;
  return {
    ok: true,
    email: data.email_address,
    status: data.status, // subscribed | unsubscribed | cleaned | pending | transactional
    tags: Array.isArray(data.tags) ? data.tags.map((t: any) => t?.name).filter(Boolean) : [],
    raw: data, // keep for debugging; remove if you don’t want to expose
  };
}

export async function GET(req: Request) {
  // Auth (middleware should also guard /api/admin/**, but this enables direct curl with Bearer)
  if (!adminBearerOk(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim();

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "email query param is required, e.g. ?email=user@example.com" },
      { status: 400 }
    );
  }

  try {
    const mc = await getMailchimpMember(email);
    return NextResponse.json({ ok: true, source: "mailchimp", email, result: mc }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
