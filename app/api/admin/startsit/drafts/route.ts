import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";

const DRAFT_KEY = (id: string) => `ss:draft:${id}`;
const DRAFT_IDX = "ss:draft:index"; // sorted-set score = updatedAt ms

export async function GET() {
  if (!kv) return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 500 });

  // newest first
  const ids: string[] = await kv.zrange(DRAFT_IDX, -100, -1, { rev: true });
  const drafts = await Promise.all(ids.map((id) => kv.get(DRAFT_KEY(id))));
  return NextResponse.json({
    ok: true,
    items: drafts
      .filter(Boolean)
      .map((d: any) => ({ id: d.id, key: d.key, title: d.title, updatedAt: d.updatedAt })),
  });
}

export async function POST(req: Request) {
  if (!kv) return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 500 });
  const { id, key, title, markdown } = await req.json();

  const draftId = id || randomUUID();
  const now = Date.now();
  const draft = {
    id: draftId,
    key: String(key || "").trim(),
    title: String(title || "").trim(),
    markdown: String(markdown || ""),
    updatedAt: now,
    createdAt: id ? undefined : now,
  };

  await kv.set(DRAFT_KEY(draftId), draft);
  await kv.zadd(DRAFT_IDX, { score: now, member: draftId });
  return NextResponse.json({ ok: true, id: draftId });
}
