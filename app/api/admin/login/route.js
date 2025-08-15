// app/api/admin/login/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";      // ensure Node runtime on Vercel
export const dynamic = "force-dynamic";

const ADMIN_COOKIE = "skol_admin";

function setOkCookie(res) {
  res.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
function clearCookie(res) {
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST(req) {
  // Accept both form and JSON
  let user = "", pass = "";
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      user = (form.get("user") || form.get("username") || "").toString();
      pass = (form.get("pass") || form.get("password") || "").toString();
    } else {
      const body = await req.json();
      user = body?.user || "";
      pass = body?.pass || "";
    }
  } catch {
    // fall through and validate below
  }

  if (!user || !pass) {
    const res = NextResponse.redirect(new URL("/admin/login?error=missing", req.url));
    return clearCookie(res);
  }
  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) {
    const res = NextResponse.redirect(new URL("/admin/login?error=invalid", req.url));
    return clearCookie(res);
  }

  // Success -> go to /admin and set cookie
  const res = NextResponse.redirect(new URL("/admin", req.url));
  return setOkCookie(res);
}

// Optional: GET to log out
export async function GET(req) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  return clearCookie(res);
}
