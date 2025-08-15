// middleware.js
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow these without a session
  const allow =
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/whoami");

  if (allow) return NextResponse.next();

  const cookie = req.cookies.get("skol_admin");
  const authed = cookie?.value === "1";

  // Block APIs
  if (pathname.startsWith("/api/admin/")) {
    if (!authed) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Block pages
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
