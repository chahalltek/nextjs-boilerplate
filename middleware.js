// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = new URL(req.url);

  // Only protect admin routes (UI + APIs)
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const expectedUser = process.env.ADMIN_USER || "";
  const expectedPass = process.env.ADMIN_PASS || "";

  if (!expectedUser || !expectedPass) {
    // Fail clearly if not configured
    return new NextResponse("Admin auth not configured", { status: 500 });
  }

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }

  // Edge-safe base64 decode (no Buffer in middleware)
  let decoded;
  try {
    decoded = atob(auth.slice(6)); // "user:pass"
  } catch {
    return new NextResponse("Invalid Authorization header", { status: 400 });
  }
  const i = decoded.indexOf(":");
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);

  if (user !== expectedUser || pass !== expectedPass) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
