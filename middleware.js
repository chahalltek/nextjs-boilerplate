import { NextResponse } from "next/server";
import {
  validateSessionCookie,
  maybeIssueSessionFromAuthorization,
} from "@/lib/adminAuth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function middleware(req) {
  const url = req.nextUrl;
  const path = url.pathname;
  const isApi = path.startsWith("/api/");
  const isAdminScope = path.startsWith("/admin") || path.startsWith("/api/admin");

  if (!isAdminScope) return NextResponse.next();

  // If the request included valid Basic creds, mint the session cookie.
  const withCookie = maybeIssueSessionFromAuthorization(req);
  if (withCookie) return withCookie;

  // Already logged in via cookie?
  if (validateSessionCookie(req)) return NextResponse.next();

  // Not logged in:
  if (isApi) {
    // For API calls, DO NOT trigger browser Basic prompt
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // For page loads, show browser Basic challenge once
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
  });
}
