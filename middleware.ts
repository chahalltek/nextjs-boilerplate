// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

const ADMIN_COOKIE = "skol_admin";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

/** Routes that should bypass auth (login endpoints) */
function isLoginPath(pathname: string) {
  return pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login");
}

/** Optional Basic Auth support (if ADMIN_PASS is set) */
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

/** NEW: Allow admin API access via Bearer ADMIN_API_KEY */
function bearerOk(req: NextRequest) {
  if (!ADMIN_API_KEY) return false;
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") && h.slice(7) === ADMIN_API_KEY;
}

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Always allow login endpoints
  if (isLoginPath(pathname)) return NextResponse.next();

  // 2) If they already have the admin cookie/session, allow
  const hasCookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (hasCookie) return NextResponse.next();

  // 3) Allow Basic auth, if configured
  if (basicAuthOk(req)) return NextResponse.next();

  // 4) Allow Bearer admin key for API routes only
  if (pathname.startsWith("/api/admin/") && bearerOk(req)) {
    return NextResponse.next();
  }

  // 5) Otherwise block
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Non-API pages → redirect to /admin/login with "from"
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname + (search || ""));
  url.searchParams.set("error", "missing admin session");
  return NextResponse.redirect(url);
}
