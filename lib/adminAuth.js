// lib/adminAuth.js
import { NextResponse } from "next/server";

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) return null;
  try {
    const decoded = typeof atob === "function"
      ? atob(header.slice(6))
      : Buffer.from(header.slice(6), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i === -1) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

export function requireAdminAuth(request) {
  const expectedUser = process.env.ADMIN_USER || "";
  const expectedPass = process.env.ADMIN_PASS || "";

  const creds = parseBasicAuth(request.headers.get("authorization"));
  if (!creds) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }
  if (creds.user !== expectedUser || creds.pass !== expectedPass) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return null; // OK
}
