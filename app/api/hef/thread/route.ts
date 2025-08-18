import { NextResponse } from "next/server";
import { createThread, getCurrentThread, getReactions } from "@/lib/hef/store";

export async function GET() {
  const thread = await getCurrentThread();
  if (!thread) return NextResponse.json({ thread: null });
  const reactions = await getReactions(thread.id);
  return NextResponse.json({ thread, reactions });
}

export async function POST(req: Request) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  const key = req.headers.get("x-admin-key") || "";
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { title, body } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "title/body required" }, { status: 400 });
  }
  const t = await createThread({ title, body });
  return NextResponse.json({ ok: true, id: t.id });
}
