// app/api/admin/whoami/route.js
import { NextResponse } from "next/server";
import { readSession } from "@/lib/adminAuth";

export async function GET() {
  const s = readSession();
  return NextResponse.json({ ok: !!s, who: s?.user || null }, { status: s ? 200 : 401 });
}
