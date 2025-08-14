// middleware.js
import { NextResponse } from "next/server";

export const config = {
  // Only admin pages, not API
  matcher: ["/admin/:path*"],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // If the session cookie is already there, let it through.
  const hasSession = req.cookies.get("skol_admin")?.value;
  if (hasSession) return NextResponse.next();

  // Ask for HTTP Basic just once to mint a cookie.
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Skol Sisters Admin"' },
    });
  }

  const [user, pass] = Buffer.from(auth.slice(6), "base64")
    .toString()
    .split(":");

  if (
    user !== process.env.ADMIN_USER ||
    pass !== process.env.ADMIN_PASS
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Good creds -> give a cookie so we don't keep prompting.
  const res = NextResponse.next();
  res.cookies.set("skol_admin", "ok", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });
  return res;
}
