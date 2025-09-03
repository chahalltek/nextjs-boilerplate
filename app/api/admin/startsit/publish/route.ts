// app/api/admin/startsit/publish/route.ts
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CURRENT = "ss:current";
const THREAD  = (id: string) => `ss:thread:${id}`;
const DRAFT   = (id: string) => `ss:draft:${id}`;

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const draft: any = await kv.get(DRAFT(id));
  if (!draft) return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404 });

  const thread = {
    id,
    week: String(draft.key || draft.week || ""),
    title: String(draft.title || ""),
    body: String(draft.markdown || draft.body || ""),
    createdAt: draft.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    published: true,
  };

  await kv.set(THREAD(id), thread);
  await kv.set(CURRENT, { id, week: thread.week });

  // Mark draft published (optional)
  await kv.set(DRAFT(id), { ...draft, status: "published", publishedAt: thread.updatedAt });

  return NextResponse.json({ ok: true, id });
}
