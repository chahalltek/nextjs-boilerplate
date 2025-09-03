// app/api/admin/startsit/draft/[id]/route.ts
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DRAFT = (id: string) => `ss:draft:${id}`;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const draft = await kv.get(DRAFT(params.id));
  if (!draft) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json(draft);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const existing: any = (await kv.get(DRAFT(params.id))) || {};
  const next = {
    ...existing,
    key: String(body.key ?? existing.key ?? ""),
    title: String(body.title ?? existing.title ?? ""),
    markdown: String(body.markdown ?? existing.markdown ?? ""),
    updatedAt: new Date().toISOString(),
  };
  await kv.set(DRAFT(params.id), next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await kv.del(DRAFT(params.id));
  await kv.srem("ss:draft:ids", params.id);
  return NextResponse.json({ ok: true });
}
