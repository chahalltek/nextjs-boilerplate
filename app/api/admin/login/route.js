import { NextResponse } from "next/server";
import {
  makeSessionValue,
  setSessionCookie,
  clearSessionCookie,
  readSession,
} from "@/lib/adminAuth";

export async function GET() {
  // Quick “am I logged in?”
  const s = readSession();
  return s
    ? NextResponse.json({ ok: true, user: s.user })
    : NextResponse.json({ ok: false }, { status: 401 });
}

export async function POST(req) {
  const { user, pass } = await req.json().catch(() => ({}));
  const U = process.env.ADMIN_USER || "";
  const P = process.env.ADMIN_PASSWORD || "";
  const S = process.env.ADMIN_COOKIE_SECRET || "";

  if (!user || !pass) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  if (!S) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  if (user === U && pass === P) {
    const res = NextResponse.json({ ok: true });
    const value = makeSessionValue(user, S);
    setSessionCookie(res, value);
    return res;
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
