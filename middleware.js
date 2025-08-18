// middleware.js
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

const ADMIN_COOKIE = "skol_admin";
const ADMIN_USER = process.env.ADMIN_USER || "admin"; // optional Basic Auth
const ADMIN_PASS = process.env.ADMIN_PASS || "";      // optional Basic Auth

function isLoginPath(pathname) {
  return (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api/admin/login")
  );
}

function basicAuthOk(req) {
  // Only checks if env is configured; otherwise disabled.
  if (!ADMIN_PASS) return false;
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  try {
    // Edge runtime: use atob (avoid Buffer)
    const [user, pass] = atob(header.slice(6)).split(":");
    return user === ADMIN_USER && pass === ADMIN_PASS;
  } catch {
    return false;
  }
}

export default function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // Allow the login endpoints themselves
  if (isLoginPath(pathname)) return NextResponse.next();

  // Cookie session from your /api/admin/login handler
  const hasCookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (hasCookie) return NextResponse.next();

  // Optional fallback: Basic Auth (if ADMIN_PASS is set)
  if (basicAuthOk(req)) return NextResponse.next();

  // Not authenticated
  if (pathname.startsWith("/api/")) {
    // APIs get a JSON 401, not a redirect to HTML
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Pages: redirect to /admin/login, preserving "from"
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname + (search || ""));
  url.searchParams.set("error", "missing admin session");
  return NextResponse.redirect(url);
}
