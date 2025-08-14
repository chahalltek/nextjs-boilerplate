// app/api/admin/login/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";       // important on Vercel
export const dynamic = "force-dynamic";

const ADMIN_COOKIE = "skol_admin";

export async function POST(req) {
  const { user, pass } = await req.json().catch(() => ({}));

  if (!user || !pass) {
    return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 });
  }
  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) {
    return NextResponse.json({ ok: false, error: "Invalid username or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });
  return res;
}

// Optional logout: GET /api/admin/login
export async function GET() {
  const res = NextResponse.json({ ok: true, logout: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
