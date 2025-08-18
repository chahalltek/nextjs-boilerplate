import { NextResponse } from "next/server";
import { addReply, listReplies } from "@/lib/hef/store";

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
