// middleware.js
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "skol_admin";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(req.cookies.get(ADMIN_COOKIE)?.value);

  const isAdminUI = pathname.startsWith("/admin");
  const isLogin = pathname.startsWith("/admin/login");
  const isAdminAPI = pathname.startsWith("/api/admin");

  // Protect API: no cookie -> 401 JSON
  if (isAdminAPI && !hasCookie) {
    return new NextResponse(JSON.stringify({ ok: false, error: "Unauthorized: missing admin session" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Protect UI: no cookie -> redirect to /admin/login?next=...
  if (isAdminUI && !isLogin && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
