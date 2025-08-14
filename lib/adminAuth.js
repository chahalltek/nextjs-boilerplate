// lib/adminAuth.js
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "skol_admin";

export function requireAdmin() {
  const ok = Boolean(cookies().get(ADMIN_COOKIE)?.value);
  if (ok) return null;
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
