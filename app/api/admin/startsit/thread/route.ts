// app/api/admin/startsit/thread/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";

const kCurrent = "ss:current"; // current thread meta
const kThread = (id: string) => `ss:thread:${id}`; // full thread object
const kReplies = (id: string) => `ss:replies:${id}`; // list of reply ids (optional later)

export async function POST(req: Request) {
  try {
    const { week, title, body } = await req.json();

    const id = randomUUID();
    const thread = {
      id,
      week: String(week || "").trim(),
      title: String(title || "").trim(),
      body: String(body || ""),
      createdAt: new Date().toISOString(),
    };

    await kv.set(kThread(id), thread);
    await kv.set(kCurrent, { id, week: thread.week });

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 400 });
  }
}
