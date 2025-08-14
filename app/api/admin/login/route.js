// app/api/admin/login/route.js
import { NextResponse } from "next/server";
import { issueAdminSession, clearAdminSession } from "@/lib/adminAuth";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  issueAdminSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearAdminSession();
  return NextResponse.json({ ok: true });
}
