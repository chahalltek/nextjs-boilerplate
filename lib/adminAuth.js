// lib/adminAuth.js
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// must match middleware.js
const ADMIN_COOKIE = "skol_admin";

/**
 * Lightweight guard used by legacy API routes.
 * Returns a NextResponse(401) when there’s no admin cookie.
 * If the caller ignores the return value, middleware will still block.
 */
export function requireAdmin() {
  const ok = Boolean(cookies().get(ADMIN_COOKIE)?.value);
  if (ok) return null;
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
