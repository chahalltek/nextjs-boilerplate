// app/api/subscribe/route.js
export const runtime = "nodejs";

import { kv } from "@vercel/kv";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { subscribeEmail } from "@/lib/newsletter/store";

// -------- helpers --------
function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}
function codeFromEmail(email) {
  const h = crypto.createHash("sha256").update(String(email).toLowerCase()).digest("base64url");
  return h.slice(0, 10);
}
function toArrayMaybe(value) {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(","); // supports comma-separated
}
function normalizeTag(t) {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 64);
}

export async function POST(req) {
  try {
    const body = (await req.json().catch(() => ({}))) || {};
    const email = String(body.email || "").trim().toLowerCase();
    const source = String(body.source || "site").trim();

    // tags can come as `tag` (string) or `tags` (array or CSV)
    const rawTags = [
      ...toArrayMaybe(body.tags),
      ...(body.tag ? [body.tag] : []),
    ];
    const tags = [...new Set(rawTags.map(normalizeTag).filter(Boolean))];

    if (!isEmail(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const code = codeFromEmail(email);
    const now = new Date().toISOString();

    // ---- Mailchimp (or KV fallback) upsert ----
    const mcResult = await subscribeEmail(email, {
      tags: tags.length ? tags : undefined,
      source,
    });

    // ---- Persist lightweight record in KV for your own analytics/referrals ----
    // Preserve createdAt when possible
    let createdAt = now;
    try {
      const prev = await kv.hget(`sub:email:${email}`, "createdAt");
      if (prev) createdAt = String(prev);
    } catch {
      // ignore
    }

    await kv.hset(`sub:email:${email}`, {
      email,
      createdAt,
      lastSeenAt: now,
      source,
    });
    await kv.sadd("sub:all", email);

    for (const t of tags) {
      await kv.sadd(`sub:tag:${t}`, email);
    }
    if (source) await kv.sadd(`sub:source:${source}`, email);

    // referral code mapping (idempotent)
    await kv.set(`ref:email:${email}`, code);
    await kv.set(`ref:code:${code}`, email);

    return NextResponse.json({
      ok: true,
      code,
      via: mcResult?.ok ? mcResult.via : "kv",
      // include a hint if Mailchimp failed but KV succeeded
      mailchimp: mcResult?.ok ? "ok" : "skipped-or-failed",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
