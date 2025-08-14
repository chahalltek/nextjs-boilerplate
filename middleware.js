// middleware.js
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "skol_admin";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(req.cookies.get(ADMIN_COOKIE)?.value);

  const isAdminUI = pathname.startsWith("/admin");
  const isLogin = pathname.startsWith("/admin/login");
  const isAdminAPI = pathname.startsWith("/api/admin");

  if (isAdminAPI && !hasCookie) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: "Unauthorized: missing admin session" }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }

  if (isAdminUI && !isLogin && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
