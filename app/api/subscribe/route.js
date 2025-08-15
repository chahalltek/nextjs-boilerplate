import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Required env:
 * MAILCHIMP_API_KEY  e.g. "us6-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 * MAILCHIMP_LIST_ID  audience/list id
 * MAILCHIMP_DC       data center, e.g. "us6" (if not embedded in key)
 */
function getEnv() {
  const key = process.env.MAILCHIMP_API_KEY || "";
  const listId = process.env.MAILCHIMP_LIST_ID || "";
  const dc = process.env.MAILCHIMP_DC || (key.split("-")[1] || "");
  if (!key || !listId || !dc) {
    throw new Error("Missing Mailchimp env: MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_DC");
  }
  return { key, listId, dc };
}

function mcHeaders(key) {
  return {
    "Authorization": `apikey ${key}`, // basic auth style header Mailchimp expects
    "Content-Type": "application/json",
  };
}

function hashEmail(email) {
  return crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
}

async function getMember(dc, listId, key, email) {
  const hash = hashEmail(email);
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${hash}`;
  const r = await fetch(url, { headers: mcHeaders(key), cache: "no-store" });
  if (r.status === 404) return null;
  const j = await r.json();
  if (!r.ok) throw new Error(j.title || j.detail || `Mailchimp get ${r.status}`);
  return j; // has .status
}

async function createPending(dc, listId, key, email, mergeFields = {}) {
  // PUT by hash upserts; status_if_new=pending triggers confirmation
  const hash = hashEmail(email);
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${hash}`;
  const body = {
    email_address: email,
    status_if_new: "pending",
    status: "pending",
    merge_fields: mergeFields,
  };
  const r = await fetch(url, {
    method: "PUT",
    headers: mcHeaders(key),
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.title || j.detail || `Mailchimp upsert ${r.status}`);
  return j;
}

async function resendConfirmation(dc, listId, key, email) {
  const hash = hashEmail(email);
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${hash}/actions/resend-confirmation`;
  const r = await fetch(url, { method: "POST", headers: mcHeaders(key) });
  // Mailchimp returns 204 No Content on success
  if (r.status === 204) return { ok: true };
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = { raw: txt }; }
  if (!r.ok) throw new Error(j.title || j.detail || `Mailchimp resend ${r.status}`);
  return { ok: true };
}

export async function POST(req) {
  try {
    const { key, listId, dc } = getEnv();

    const payload = await req.json().catch(() => ({}));
    const email = (payload.email || "").trim();
    const fname = (payload.fname || "").trim();
    const lname = (payload.lname || "").trim();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
    }

    // Check current status
    const member = await getMember(dc, listId, key, email);

    if (!member) {
      // brand new -> create pending (triggers confirmation)
      await createPending(dc, listId, key, email, { FNAME: fname, LNAME: lname });
      return NextResponse.json({ ok: true, state: "pending", message: "Check your email to confirm." });
    }

    switch (member.status) {
      case "subscribed":
        return NextResponse.json({ ok: true, state: "subscribed", message: "You're already subscribed." });
      case "unsubscribed":
      case "transactional":
      case "cleaned":
        // try to move to pending -> confirmation email
        await createPending(dc, listId, key, email, { FNAME: fname, LNAME: lname });
        return NextResponse.json({ ok: true, state: "pending", message: "Check your email to confirm." });
      case "pending":
      default:
        // already pending -> resend confirmation
        await resendConfirmation(dc, listId, key, email);
        return NextResponse.json({ ok: true, state: "pending", message: "We just re-sent the confirmation email." });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
