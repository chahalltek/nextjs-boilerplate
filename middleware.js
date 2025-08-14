// middleware.js
import { NextResponse } from "next/server";

// Protect admin pages and admin APIs
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

// Edge-safe helpers (no node:crypto)
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function cookieSignature() {
  const u = process.env.ADMIN_USER || "";
  const p = process.env.ADMIN_PASS || "";
  const s = process.env.ADMIN_SECRET || "fallback-secret";
  return sha256Hex(`${u}:${p}:${s}`);
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const cookieName = "skol-admin";
  const need = await cookieSignature();
  const have = req.cookies.get(cookieName)?.value;

  // Already has a valid session
  if (have === need) return NextResponse.next();

  // Check Basic Auth
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const creds = atob(auth.split(" ")[1]);
      const i = creds.indexOf(":");
      const user = creds.slice(0, i);
      const pass = creds.slice(i + 1);
      if (user === (process.env.ADMIN_USER || "") && pass === (process.env.ADMIN_PASS || "")) {
        const res = NextResponse.next();
        // IMPORTANT: cookie path covers / and thus /api/*
        res.cookies.set(cookieName, need, {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",
          maxAge: 60 * 60 * 8, // 8 hours
        });
        return res;
      }
    } catch {}
  }

  // If it’s an API call, don’t trigger the browser’s auth dialog
  if (isApi) {
    return new NextResponse(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  // For pages, show the Basic Auth challenge
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Skol Admin"' },
  });
}
