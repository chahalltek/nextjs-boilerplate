import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { addReply, listReplies } from "@/lib/hef/store";

export const runtime = "nodejs";

// List replies in a thread
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    if (!threadId) return NextResponse.json({ replies: [] });
    const replies = await listReplies(threadId);
    return NextResponse.json({ replies });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 500 });
  }
}

// Create a reply (rate-limited)
export async function POST(req: Request) {
  // 5 replies / 60s per IP for Hold ’em / Fold ’em
  const ip = getClientIp(req);
  const { success, reset, limit } = await rateLimit(`${ip}:hef:reply`, {
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

  const { threadId, name, message } = await req.json();
  if (!threadId || !message?.trim()) {
    return NextResponse.json(
      { error: "threadId/message required" },
      { status: 400 }
    );
  }

  // ✅ match store signature: (threadId, name, message)
  const reply = await addReply(
    threadId,
    (name?.trim() || "Anonymous"),
    message.trim()
  );

  return NextResponse.json({ ok: true, reply });
}
