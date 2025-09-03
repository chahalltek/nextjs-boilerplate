import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";

const DRAFT_KEY  = (id: string) => `ss:draft:${id}`;
const THREAD_KEY = (id: string) => `ss:thread:${id}`;
const CURRENT_KEY = "ss:current";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const draft: any = await kv.get(DRAFT_KEY(id));
  if (!draft) return NextResponse.json({ ok: false, error: "Draft not found" }, { status: 404 });

  const threadId = randomUUID();
  const thread = {
    id: threadId,
    week: draft.key || "",
    title: draft.title || "",
    body: draft.markdown || "",
    createdAt: new Date().toISOString(),
  };

  await kv.set(THREAD_KEY(threadId), thread);
  await kv.set(CURRENT_KEY, { id: threadId, week: thread.week });

  return NextResponse.json({ ok: true, id: threadId });
}
