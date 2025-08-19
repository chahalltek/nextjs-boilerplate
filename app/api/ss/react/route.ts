import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LATEST_KEY = "ss:latest";
const reactsKey = (id: string) => `ss:reacts:${id}`;

export async function POST(req: Request) {
  try {
    const { emoji, threadId } = await req.json();
    if (!emoji) return NextResponse.json({ error: "missing emoji" }, { status: 400 });

    const id = (threadId as string) || (await kv.get<string>(LATEST_KEY));
    if (!id) return NextResponse.json({ error: "no active thread" }, { status: 404 });

    // hincrby for that emoji key
    await kv.hincrby(reactsKey(id), emoji, 1);
    const all = await kv.hgetall<Record<string, number>>(reactsKey(id));
    return NextResponse.json({ ok: true, reactions: all || {} });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 400 });
  }
}
