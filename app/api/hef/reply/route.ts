import { NextResponse } from "next/server"; // if not already present
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { addReply, listReplies } from "@/lib/hef/store";

export const runtime = "nodejs"; // keep if you already have it

export async function POST(req: Request) {
  // 🛡️ Rate limit: 5 replies / 60s per IP for Start/Sit
  const ip = getClientIp(req);
  const { success, remaining, reset, limit } = await rateLimit(`${ip}:ss:reply`, {
    limit: 5,
    window: 60,
  });
  if (!success) {
    const retry = Math.max(1, reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { error: "Too many replies. Please try again in a moment." },
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

  // ⬇️ your existing logic stays the same below this line
  // const body = await req.json(); ...
  // write to KV / return response, etc.
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ replies: [] });
  const replies = await listReplies(threadId);
  return NextResponse.json({ replies });
}

export async function POST(req: Request) {
  const { threadId, name, message } = await req.json();
  if (!threadId || !message?.trim()) {
    return NextResponse.json({ error: "threadId/message required" }, { status: 400 });
  }
  const r = await addReply(threadId, name || "Anonymous", message);
  return NextResponse.json({ ok: true, reply: r });
}
