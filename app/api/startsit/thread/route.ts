// app/api/startsit/thread/route.ts
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

// Create/replace the Start/Sit discussion thread metadata
export async function POST(req: Request) {
  // modest protection for the endpoint
  const ip = getClientIp(req);
  const { success, reset, limit } = await rateLimit(`${ip}:ss:thread`, {
    limit: 3,
    window: 60,
  });
  if (!success) {
    const retry = Math.max(1, reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retry),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(reset),
        },
      }
    );
  }

  const { key, title, content } = await req.json();

  if (!key || !title?.trim()) {
    return NextResponse.json(
      { error: "key and title required" },
      { status: 400 }
    );
  }

  const threadId = `ss:${key}`;
  const thread = {
    id: threadId,
    title: title.trim(),
    content: content || "",
    createdAt: new Date().toISOString(),
  };

  await kv.set(`startsit:thread:${threadId}`, thread);
  await kv.set("startsit:current", threadId);

  return NextResponse.json({ ok: true, threadId });
}
