// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

const ADMIN_COOKIE  = "skol_admin";
const ADMIN_USER    = process.env.ADMIN_USER || "admin";
const ADMIN_PASS    = process.env.ADMIN_PASS || "";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

function isLoginPath(pathname: string) {
  return pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login");
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

function bearerOk(req: NextRequest) {
  if (!ADMIN_API_KEY) return false;
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;
  return header.slice(7).trim() === ADMIN_API_KEY;
}

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isLoginPath(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/admin/") && bearerOk(req)) return NextResponse.next();
  if (req.cookies.get(ADMIN_COOKIE)?.value) return NextResponse.next();
  if (basicAuthOk(req)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname + (search || ""));
  url.searchParams.set("error", "missing admin session");
  return NextResponse.redirect(url);
}
