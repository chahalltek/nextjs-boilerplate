// middleware.ts (at project root)
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

const ADMIN_COOKIE = "skol_admin";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "";

// login endpoints allowed
function isLoginPath(pathname: string) {
  return pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login");
}

// if the request *includes* either an Authorization: Bearer ... or X-Admin-Key header,
// let it pass; the route will validate the actual key value.
function hasAnyAdminKeyHeader(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const hasBearer = /^Bearer\s+.+/i.test(auth);
  const hasXKey = !!req.headers.get("x-admin-key");
  return hasBearer || hasXKey;
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
  const { pathname, searchParams } = req.nextUrl;

  if (isLoginPath(pathname)) return NextResponse.next();

  // allow existing admin session cookie
  if (req.cookies.get(ADMIN_COOKIE)?.value) return NextResponse.next();

  // allow API key *header presence* (route will verify)
  if (hasAnyAdminKeyHeader(req)) return NextResponse.next();

  // optional HTTP Basic
  if (basicAuthOk(req)) return NextResponse.next();

  // block
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  const qs = searchParams.toString();
  url.search = qs ? `?${qs}` : "";
  url.searchParams.set("error", "missing admin session");
  return NextResponse.redirect(url);
}
