// middleware.js
import { NextResponse } from "next/server";

function decodeBasic(header) {
  try {
    const b64 = header.slice(6).trim(); // strip "Basic "
    const decoded =
      typeof atob === "function"
        ? atob(b64) // Edge runtime
        : Buffer.from(b64, "base64").toString("utf8"); // Node (fallback)
    const i = decoded.indexOf(":");
    if (i < 0) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

export function middleware(req) {
  const { pathname } = new URL(req.url);

  // Only protect admin UI + admin APIs
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const expectedUser = (process.env.ADMIN_USER || "").trim();
  const expectedPass = (process.env.ADMIN_PASS || "").trim();
  if (!expectedUser || !expectedPass) {
    return new NextResponse("Admin auth not configured", { status: 500 });
  }

  const auth = req.headers.get("authorization") || "";

  if (!auth.startsWith("Basic ")) {
    // Change realm string if you need to bust the browser's cached creds
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="skol-admin-v2"' },
    });
  }

  const creds = decodeBasic(auth);
  if (!creds) return new NextResponse("Invalid Authorization header", { status: 400 });

  // Strict compare
  if (creds.user !== expectedUser || creds.pass !== expectedPass) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
