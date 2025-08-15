// app/api/admin/login/route.js
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  cookieOptions,
  isValidCredentials,
  issueSession,
  readSession,
} from "@/lib/adminAuth";

// GET -> simple "who am I?"
export async function GET() {
  const s = readSession();
  if (!s) return NextResponse.json({ ok: false, who: null }, { status: 401 });
  return NextResponse.json({ ok: true, who: s.user });
}

// POST -> login OR logout
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (body?.logout) {
    const res = NextResponse.json({ ok: true, cleared: true });
    // clear cookie
    res.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    return res;
  }

  const { username, password } = body || {};
  if (!isValidCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = issueSession(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, cookieOptions());
  return res;
}
