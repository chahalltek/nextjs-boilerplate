import { NextResponse } from "next/server";
import { HEF_EMOJI, incReaction, getReactions } from "@/lib/hef/store";

export async function POST(req: Request) {
  const { threadId, emoji } = await req.json();
  if (!threadId || !HEF_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await incReaction(threadId, emoji);
  const reactions = await getReactions(threadId);
  return NextResponse.json({ ok: true, reactions });
}
