import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LATEST_KEY = "ss:latest";
const repliesKey = (id: string) => `ss:replies:${id}`;

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: Request) {
  try {
    const { name, body, threadId } = await req.json();
    const id = (threadId as string) || (await kv.get<string>(LATEST_KEY));
    if (!id) return NextResponse.json({ error: "no active thread" }, { status: 404 });
    if (!body) return NextResponse.json({ error: "missing body" }, { status: 400 });

    const reply = {
      id: newId(),
      name: (name || "Anonymous").toString().slice(0, 80),
      body: String(body),
      createdAt: new Date().toISOString(),
    };

    await kv.lpush(repliesKey(id), JSON.stringify(reply));
    return NextResponse.json({ ok: true, reply });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 400 });
  }
}
