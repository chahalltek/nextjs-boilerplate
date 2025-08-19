// app/api/startsit/thread/route.ts
import { NextResponse } from "next/server"; // if not already present
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

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

const kCurrent = "ss:current";
const kThread = (id: string) => `ss:thread:${id}`;
const kReplies = (id: string) => `ss:replies:${id}`;
const kReply = (rid: string) => `ss:reply:${rid}`;

export async function GET() {
  const cur = await kv.get<{ id: string; week?: string }>(kCurrent);
  if (!cur?.id) return NextResponse.json({ thread: null, replies: [] });
  const thread = await kv.get(kThread(cur.id));
  // You can wire replies later
  let replies: any[] = [];
  try {
    const rids = await kv.lrange<string>(kReplies(cur.id), 0, -1);
    if (rids?.length) {
      const got: any[] = [];
      for (const rid of rids) {
        const r = await kv.get(kReply(rid));
        if (r) got.push(r);
      }
      replies = got;
    }
  } catch {
    // ignore if list not present
  }
  return NextResponse.json({ thread, replies });
}
