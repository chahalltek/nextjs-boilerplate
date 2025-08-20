// app/api/subscribe/route.ts
export const runtime = "nodejs";

import { kv } from "@vercel/kv";
import crypto from "crypto";
import { NextResponse } from "next/server";

type Body = { email?: string; tag?: string; source?: string };

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function codeFromEmail(email: string) {
  // short deterministic code
  const h = crypto.createHash("sha256").update(email.toLowerCase()).digest("base64url");
  return h.slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const tag = (body.tag || "").trim().toLowerCase();
    const source = body.source || "";

    if (!isEmail(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const code = codeFromEmail(email);
    const now = new Date().toISOString();

    // save core record
    await kv.hset(`sub:email:${email}`, {
      email, createdAt: now, lastSeenAt: now,
    });

    if (tag) {
      await kv.sadd(`sub:tag:${tag}`, email);
    }
    if (source) {
      await kv.sadd(`sub:source:${source}`, email);
    }
    await kv.sadd("sub:all", email);

    // referral maps
    await kv.set(`ref:email:${email}`, code);
    await kv.set(`ref:code:${code}`, email);

    return NextResponse.json({ ok: true, code });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
