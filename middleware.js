// middleware.js
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "skol_admin";
const PROTECTED = ["/admin", "/api/admin"];

export function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

  const isProtected =
    PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) &&
    !pathname.startsWith("/admin/login");

  if (!isProtected) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(ADMIN_COOKIE)?.value);

  if (hasSession) return NextResponse.next();

  // APIs: return 401 JSON
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: missing admin session" },
      { status: 401 }
    );
  }

  // Pages: redirect to /admin/login with an error + next
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  if (!searchParams.get("next")) url.searchParams.set("next", pathname);
  url.searchParams.set("error", "Unauthorized: missing admin session");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
