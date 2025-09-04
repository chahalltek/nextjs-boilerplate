// app/api/admin/newsletter/recipients/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import crypto from "crypto";

export const runtime = "nodejs"; // we use crypto

// ---------- Auth ----------
function adminOk(req: Request) {
  const expected = process.env.ADMIN_API_KEY || "";
  if (!expected) return false;

  const h = new Headers(req.headers);
  const bearer = h.get("authorization");
  if (bearer && bearer.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim() === expected;
  }
  const x = h.get("x-admin-key");
  if (x && x === expected) return true;
  return false;
}

// ---------- KV helpers ----------
async function kvSmembers(key: string): Promise<string[]> {
  try {
    const arr = (await kv.smembers(key)) as string[]; // cast the WHOLE return to string[]
    return (arr || []).map((s) => (s || "").toLowerCase());
  } catch {
    return [];
  }
}

async function getSuppressions(): Promise<Set<string>> {
  const suppressed = await kvSmembers("newsletter:suppressions"); // your own unsub list (if used)
  return new Set(suppressed);
}

async function getDList(): Promise<string[]> {
  const extra = await kvSmembers("newsletter:dlist"); // your “D-list” (optional)
  return extra;
}

// ---------- Mailchimp ----------
type McMember = { email_address: string; status: string };

function mcEnvOk() {
  return Boolean(
    process.env.MAILCHIMP_API_KEY &&
      process.env.MAILCHIMP_SERVER_PREFIX &&
      process.env.MAILCHIMP_LIST_ID
  );
}

function mcAuthHeader() {
  const apiKey = process.env.MAILCHIMP_API_KEY!;
  return "Basic " + Buffer.from(`anystring:${apiKey}`).toString("base64");
}

async function mcListSubscribed(): Promise<string[]> {
  const dc = process.env.MAILCHIMP_SERVER_PREFIX!;
  const listId = process.env.MAILCHIMP_LIST_ID!;
  const auth = mcAuthHeader();

  const perPage = 1000;
  let offset = 0;
  const emails: string[] = [];
  const MAX_PAGES = 5;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`);
    url.searchParams.set("status", "subscribed");
    url.searchParams.set("count", String(perPage));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("fields", "members.email_address,members.status,total_items");

    const res = await fetch(url.toString(), { headers: { authorization: auth } });
    if (!res.ok) return [];
    const json = await res.json();
    const members = (json?.members || []) as McMember[];
    for (const m of members) {
      if (m.status === "subscribed" && m.email_address) {
        emails.push(m.email_address.toLowerCase());
      }
    }
    if (members.length < perPage) break;
    offset += perPage;
  }

  return emails;
}

async function mcGetMember(email: string) {
  const dc = process.env.MAILCHIMP_SERVER_PREFIX!;
  const listId = process.env.MAILCHIMP_LIST_ID!;
  const auth = mcAuthHeader();

  const lower = email.trim().toLowerCase();
  const hash = crypto.createHash("md5").update(lower).digest("hex");

  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${hash}`;
  const res = await fetch(url, { headers: { authorization: auth } });
  if (res.status === 404) {
    return { ok: true, found: false as const, email: lower };
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: `Mailchimp ${res.status}`, detail: json };
  }
  return {
    ok: true,
    found: true as const,
    email: json.email_address,
    status: json.status,
    last_changed: json.last_changed,
  };
}

// ---------- GET ----------
export async function GET(req: Request) {
  if (!adminOk(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const sample = Math.max(0, Math.min(200, Number(url.searchParams.get("sample") || 25)));

  if (email) {
    const suppressed = (await getSuppressions()).has(email);

    if (!mcEnvOk()) {
      return NextResponse.json({
        ok: true,
        email,
        mailchimp_configured: false,
        suppressed,
        included: !suppressed,
        reason: !suppressed ? "mc-not-configured" : "suppressed",
      });
    }

    const mc = await mcGetMember(email);
    if (!mc.ok) {
      return NextResponse.json(
        { ok: false, source: "mailchimp", error: mc.error, detail: (mc as any).detail },
        { status: 502 }
      );
    }
    if (!mc.found) {
      return NextResponse.json({
        ok: true,
        email,
        found_in_mailchimp: false,
        mailchimp_status: null,
        suppressed,
        included: false,
        reason: "not-in-mailchimp",
      });
    }

    const included = mc.status === "subscribed" && !suppressed;
    return NextResponse.json({
      ok: true,
      email: mc.email,
      found_in_mailchimp: true,
      mailchimp_status: mc.status,
      last_changed: mc.last_changed,
      suppressed,
      included,
      reason: included ? "included" : mc.status !== "subscribed" ? "mc-status" : "suppressed",
    });
  }

  let mcEmails: string[] = [];
  if (mcEnvOk()) {
    mcEmails = await mcListSubscribed();
  }

  const dlist = await getDList();
  const suppressed = await getSuppressions();

  const merged = Array.from(new Set([...mcEmails, ...dlist])).filter((e) => !suppressed.has(e));

  return NextResponse.json({
    ok: true,
    count: merged.length,
    recipients: merged.slice(0, sample),
    sources: {
      mailchimp_subscribed: mcEmails.length,
      dlist: dlist.length,
      suppressed: suppressed.size,
    },
  });
}
