export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";

const kDraft   = (id: string) => `ss:draft:${id}`;
const kThread  = (id: string) => `ss:thread:${id}`;
const kCurrent = "ss:current";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

    const d: any = await kv.get(kDraft(id));
    if (!d) return NextResponse.json({ ok: false, error: "draft not found" }, { status: 404 });

    const thread = {
      id,
      key: d.key || d.week || "",
      title: d.title || "",
      markdown: d.markdown ?? d.body ?? "",
      createdAt: new Date().toISOString(),
    };

    await kv.set(kThread(id), thread);
    await kv.set(kCurrent, { id, week: thread.key, title: thread.title });

    // Make the public page pick up the new thread right away
    try { revalidatePath("/start-sit"); } catch {}

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
