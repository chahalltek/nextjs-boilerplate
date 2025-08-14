// app/api/admin/whoami/route.js
import { NextResponse } from "next/server";

export function GET(request) {
  const has = Boolean(request.cookies.get("skol_admin")?.value);
  return NextResponse.json({ ok: true, has });
}
