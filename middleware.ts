// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

const ADMIN_COOKIE = "skol_admin";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const ADMIN_API_KEY = (process.env.ADMIN_API_KEY || "").trim();

function isLoginPath(pathname: string) {
  return pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login");
}

function hasValidAdminKey(req: NextRequest) {
  if (!ADMIN_API_KEY) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const xkey = req.headers.get("x-admin-key")?.trim();
  return bearer === ADMIN_API_KEY || xkey === ADMIN_API_KEY;
}

function basicAuthOk(req: NextRequest) {
  if (!ADMIN_PASS) return false;
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  try {
    const [user, pass] = atob(header.slice(6)).split(":");
    return user === ADMIN_USER && pass === ADMIN_PASS;
  } catch {
    return false;
  }
}

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Allow the login endpoints themselves
  if (isLoginPath(pathname)) return NextResponse.next();

  // ✅ API key bypass for server-to-server calls to /api/admin/*
  if (pathname.startsWith("/api/admin/") && hasValidAdminKey(req)) {
    return NextResponse.next();
  }

  // Cookie session set by your /api/admin/login handler
  const hasCookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (hasCookie) return NextResponse.next();

  // Optional fallback: Basic Auth
  if (basicAuthOk(req)) return NextResponse.next();

  // Not authenticated
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Pages: redirect to /admin/login
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname + (search || ""));
  url.searchParams.set("error", "missing admin session");
  return NextResponse.redirect(url);
}
