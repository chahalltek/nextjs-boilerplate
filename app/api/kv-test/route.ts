import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  await kv.set("kv:ping", Date.now());
  const last = await kv.get<number>("kv:ping");
  return NextResponse.json({ ok: true, last });
}
