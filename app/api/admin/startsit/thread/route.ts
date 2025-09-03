// app/api/admin/startsit/thread/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Thread = {
  id: string;
  week: string;
  title: string;
  body: string;
  createdAt: string;
};

const kCurrent = "ss:current";
const kThread = (id: string) => `ss:thread:${id}`;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // accept both `week` and `key` (UI sends `key`)
    const week = String(body.week ?? body.key ?? "").trim();
    const title = String(body.title ?? "").trim();
    const markdown = String(body.body ?? body.markdown ?? "");

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
      body: markdown,
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
