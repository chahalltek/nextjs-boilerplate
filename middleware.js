// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = new URL(req.url);
  const needsAuth =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!needsAuth) return NextResponse.next();

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }

  let user = "", pass = "";
  try {
    // Edge runtime has atob/btoa; avoid Node Buffer
    const decoded = atob(auth.slice(6));
    [user, pass] = decoded.split(":");
  } catch {
    return new NextResponse("Bad auth header", { status: 400 });
  }

  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
