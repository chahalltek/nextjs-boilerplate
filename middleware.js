// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";

function sessionHash(user: string, pass: string, secret: string) {
  return crypto.createHash("sha256").update(`${user}:${pass}|${secret}`).digest("hex");
}

export function middleware(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const needsAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!needsAdmin) return NextResponse.next();

  const expectedUser = process.env.ADMIN_USER ?? "";
  const expectedPass = process.env.ADMIN_PASS ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASS ?? "fallback-secret";

  const expected = sessionHash(expectedUser, expectedPass, secret);

  // 1) If we already have a valid session cookie, allow
  const cookie = req.cookies.get("admin_session")?.value;
  if (cookie === expected) return NextResponse.next();

  // 2) Otherwise require Basic auth
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }

  const decoded = Buffer.from(auth.slice(6), "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user !== expectedUser || pass !== expectedPass) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 3) First successful login: set session cookie so follow-ups don’t re-prompt
  const res = NextResponse.next();
  res.cookies.set("admin_session", expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
