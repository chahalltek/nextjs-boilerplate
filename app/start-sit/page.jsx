// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = new URL(req.url);
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdmin) return NextResponse.next();

  // Support either pair of env names
  const expectedUser = process.env.ADMIN_USER ?? process.env.ADMIN_USERNAME ?? "";
  const expectedPass = process.env.ADMIN_PASS ?? process.env.ADMIN_PASSWORD ?? "";

  if (!expectedUser || !expectedPass) {
    // Misconfiguration: no creds set in env
    return new NextResponse("Admin credentials not configured", { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    // Prompt the browser
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }

  const decoded = Buffer.from(auth.slice(6), "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user !== expectedUser || pass !== expectedPass) {
    // Wrong creds -> re-prompt (401), not 403
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }

  return NextResponse.next();
}