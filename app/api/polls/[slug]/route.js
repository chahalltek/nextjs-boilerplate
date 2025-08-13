import { NextResponse } from "next/server";
import { getPoll } from "@/lib/polls";

let MEM = new Map(); // dev fallback; resets on redeploy

function useRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = require("@upstash/redis");
  return new Redis({ url, token });
}

// GET -> results
export async function GET(_req, { params }) {
  const slug = params.slug;
  const redis = useRedis();
  let counts = {};

  if (redis) {
    counts = (await redis.hgetall(`poll:${slug}`)) || {};
  } else {
    counts = MEM.get(`poll:${slug}`) || {};
  }

  return NextResponse.json({ ok: true, counts });
}

// POST -> vote
export async function POST(req, { params }) {
  const slug = params.slug;
  const poll = getPoll(slug);
  if (!poll || poll.status !== "open") {
    return NextResponse.json({ ok: false, error: "poll-closed" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const option = body.option;

  if (!poll.options.includes(option)) {
    return NextResponse.json({ ok: false, error: "bad-option" }, { status: 400 });
  }

  // simple “one vote” cookie guard
  const cookieName = `voted_${slug}`;
  const voted = (req.headers.get("cookie") || "").includes(`${cookieName}=1`);
  if (voted) {
    return NextResponse.json({ ok: false, error: "already-voted" }, { status: 409 });
  }

  const redis = useRedis();
  let counts = {};
  if (redis) {
    await redis.hincrby(`poll:${slug}`, option, 1);
    counts = (await redis.hgetall(`poll:${slug}`)) || {};
  } else {
    counts = MEM.get(`poll:${slug}`) || {};
    counts[option] = (counts[option] || 0) + 1;
    MEM.set(`poll:${slug}`, counts);
  }

  const res = NextResponse.json({ ok: true, counts });
  res.headers.set("Set-Cookie", `${cookieName}=1; Path=/; Max-Age=31536000; SameSite=Lax`);
  return res;
}
