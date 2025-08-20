// app/api/subscribe/route.js
export const runtime = "nodejs";

import { kv } from "@vercel/kv";
import crypto from "crypto";
import { NextResponse } from "next/server";

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");
}
function codeFromEmail(email) {
  const h = crypto.createHash("sha256").update(String(email).toLowerCase()).digest("base64url");
  return h.slice(0, 10);
}

export async function POST(req) {
  try {
    const body = (await req.json().catch(() => ({}))) || {};
    const email = String(body.email || "").trim().toLowerCase();
    const tag = String(body.tag || "").trim().toLowerCase();
    const source = String(body.source || "");

    if (!isEmail(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const code = codeFromEmail(email);
    const now = new Date().toISOString();

    // core record
    await kv.hset(`sub:email:${email}`, { email, createdAt: now, lastSeenAt: now });
    await kv.sadd("sub:all", email);

    if (tag) await kv.sadd(`sub:tag:${tag}`, email);
    if (source) await kv.sadd(`sub:source:${source}`, email);

    // referral
    await kv.set(`ref:email:${email}`, code);
    await kv.set(`ref:code:${code}`, email);

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
