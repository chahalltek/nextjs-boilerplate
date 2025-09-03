import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const DRAFT_KEY = (id: string) => `ss:draft:${id}`;
const DRAFT_IDX = "ss:draft:index";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const d = await kv.get(DRAFT_KEY(params.id));
  if (!d) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json(d);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await kv.del(DRAFT_KEY(params.id));
  await kv.zrem(DRAFT_IDX, params.id);
  return NextResponse.json({ ok: true });
}
