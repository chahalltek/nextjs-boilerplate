// app/api/admin/login/route.js
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "skol_admin";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

function envUser() {
  return (
    process.env.ADMIN_USER ||
    process.env.BASIC_AUTH_USER ||
    process.env.NEXT_ADMIN_USER
  );
}
function envPass() {
  return (
    process.env.ADMIN_PASS ||
    process.env.BASIC_AUTH_PASS ||
    process.env.NEXT_ADMIN_PASS
  );
}

export async function POST(request) {
  const { user, pass } = await request.json().catch(() => ({}));

  const U = envUser();
  const P = envPass();

  if (!U || !P) {
    return NextResponse.json(
      { ok: false, error: "Server admin credentials not configured" },
      { status: 500 }
    );
  }

  if (user !== U || pass !== P) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "ok", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
