// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

const ADMIN_COOKIE = "skol_admin";
const ADMIN_USER = process.env.ADMIN_USER || "admin"; // optional Basic Auth
const ADMIN_PASS = process.env.ADMIN_PASS || "";      // optional Basic Auth
const ADMIN_KEY  = (process.env.ADMIN_API_KEY || "").trim();

function isLoginPath(pathname: string) {
  return (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api/admin/login")
  );
}

// Allow Bearer or X-Admin-Key to bypass (for CLI/API calls)
function adminKeyOk(req: NextRequest) {
  if (!ADMIN_KEY) return false;
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const bearer = m?.[1]?.trim();
  const xKey = req.headers.get("x-admin-key")?.trim();
  return bearer === ADMIN_KEY || xKey === ADMIN_KEY;
}

// Optional Basic Auth fallback
function basicAuthOk(req: NextRequest) {
  if (!ADMIN_PASS) return false;
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  try {
    // Edge-safe: use atob
    const [user, pass] = atob(header.slice(6)).split(":");
    return user === ADMIN_USER && pass === ADMIN_PASS;
  } catch {
    return false;
  }
}

export default function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Allow the login endpoints themselves
  if (isLoginPath(pathname)) return NextResponse.next();

  // If admin session cookie is present, allow
  const hasCookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (hasCookie) return NextResponse.next();

  // If ADMIN_API_KEY header is valid, allow (works for curl/cron/etc.)
  if (adminKeyOk(req)) return NextResponse.next();

  // Optional fallback: Basic Auth (if configured)
  if (basicAuthOk(req)) return NextResponse.next();

  // Not authenticated
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Pages: redirect to /admin/login, preserving "from"
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
  url.searchParams.set("error", "missing admin session");
  return NextResponse.redirect(url);
}
