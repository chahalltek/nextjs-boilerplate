// app/api/admin/startsit/thread/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";

export const runtime = "nodejs";       // ensure Node runtime (KV + crypto)
export const dynamic = "force-dynamic";

type Thread = {
  id: string;
  week: string;
  title: string;
  body: string;
  createdAt: string;
};

const kCurrent = "ss:current";                 // current thread meta
const kThread = (id: string) => `ss:thread:${id}`; // full thread object

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({} as any));
    const week = String(json.week ?? json.key ?? "").trim();
    const title = String(json.title ?? "").trim();
    const body = String(json.body ?? json.markdown ?? "");

    if (!week || !title) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: week and title" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const thread: Thread = {
      id,
      week,
      title,
      body,
      createdAt: new Date().toISOString(),
    };

    await kv.set(kThread(id), thread);
    await kv.set(kCurrent, { id, week });

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
