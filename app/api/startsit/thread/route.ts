// app/api/startsit/thread/route.ts
import { NextResponse } from "next/server"; // if not already present
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

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
