// app/api/admin/login/route.js
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  cookieOptions,
  isValidCredentials,
  issueSession,
  readSession,
} from "@/lib/adminAuth";

// Who am I?
export async function GET() {
  const s = readSession();
  if (!s) return NextResponse.json({ ok: false, who: null }, { status: 401 });
  return NextResponse.json({ ok: true, who: s.user });
}

// Login (or logout) — robustly supports JSON, form-encoded, multipart and Basic auth
export async function POST(request) {
  const url = new URL(request.url);
  const accept = request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html"); // browser form submit

  // 1) Check for logout first
  if ((request.headers.get("content-type") || "").includes("application/json")) {
    const j = await request.json().catch(() => ({}));
    if (j?.logout) {
      const res = NextResponse.json({ ok: true, cleared: true });
      res.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
      return res;
    }
  }

  // 2) Collect credentials from any source
  let username = "";
  let password = "";

  // Basic Authorization header
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [u, p] = Buffer.from(auth.slice(6), "base64").toString("utf8").split(":");
      username = u ?? "";
      password = p ?? "";
    } catch {
      // ignore
    }
  }

  // Body (JSON / form-encoded / multipart)
  if (!username) {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await request.json().catch(() => ({}));
      username = j.username ?? j.user ?? j.email ?? "";
      password = j.password ?? j.pass ?? "";
    } else {
      // handles x-www-form-urlencoded and multipart/form-data
      const fd = await request.formData().catch(() => null);
      if (fd) {
        username = (fd.get("username") ?? fd.get("user") ?? fd.get("email") ?? "").toString();
        password = (fd.get("password") ?? fd.get("pass") ?? "").toString();
      }
    }
  }

  // 3) Validate
  if (!isValidCredentials(username, password)) {
    if (wantsHtml) {
      const back = new URL("/admin/login", request.url);
      back.searchParams.set("error", "Unauthorized");
      return NextResponse.redirect(back, { status: 303 });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 4) Issue session + redirect/JSON
  const token = issueSession(username);
  const target = url.searchParams.get("from") || "/admin";
  const res = wantsHtml
    ? NextResponse.redirect(new URL(target, request.url), { status: 303 })
    : NextResponse.json({ ok: true });

  res.cookies.set(ADMIN_COOKIE, token, cookieOptions());
  return res;
}
