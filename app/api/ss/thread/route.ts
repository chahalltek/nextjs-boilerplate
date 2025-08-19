import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LATEST_KEY = "ss:latest";               // string id of latest thread
const threadKey = (id: string) => `ss:thread:${id}`;
const repliesKey = (id: string) => `ss:replies:${id}`;
const reactsKey = (id: string) => `ss:reacts:${id}`;

function requireAdmin(req: Request) {
  const key = req.headers.get("x-admin-key") || "";
  const ok = !!process.env.ADMIN_SECRET && key === process.env.ADMIN_SECRET;
  if (!ok) throw new Error("unauthorized");
}

function newId() {
  // compact ISO + random: safe to use as a KV key
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET() {
  const id = await kv.get<string>(LATEST_KEY);
  if (!id) return NextResponse.json({ ok: true, thread: null });

  const thread = await kv.get<any>(threadKey(id));
  if (!thread) return NextResponse.json({ ok: true, thread: null });

  const replies = await kv.lrange<string>(repliesKey(id), 0, -1);
  const parsedReplies = (replies || []).map((r) => {
    try { return JSON.parse(r); } catch { return null; }
  }).filter(Boolean);

  const reactions = await kv.hgetall<Record<string, number>>(reactsKey(id));
  return NextResponse.json({ ok: true, thread: { ...thread, replies: parsedReplies.reverse(), reactions: reactions || {} } });
}

export async function POST(req: Request) {
  try {
    requireAdmin(req);
    const { title, body } = await req.json();
    if (!title || !body) return NextResponse.json({ error: "missing title/body" }, { status: 400 });

    const id = newId();
    const thread = {
      id,
      kind: "start-sit",
      title: String(title),
      body: String(body),
      createdAt: new Date().toISOString(),
    };

    await kv.set(threadKey(id), thread);
    await kv.set(LATEST_KEY, id);

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    const status = e?.message === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: e?.message || "error" }, { status });
  }
}
