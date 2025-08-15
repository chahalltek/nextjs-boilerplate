// middleware.js
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

const ADMIN_COOKIE = "skol_admin";

export default function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // allow login endpoints themselves
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  const has = req.cookies.get(ADMIN_COOKIE)?.value;
  if (has) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname + search);
  url.searchParams.set("error", "missing admin session");
  return NextResponse.redirect(url);
}
