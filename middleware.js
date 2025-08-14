// middleware.js
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

// Compute a deterministic session token in Edge runtime
async function edgeHash(input) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = Array.from(new Uint8Array(buf));
  return btoa(String.fromCharCode(...bytes));
}

function parseCookie(header = "") {
  return Object.fromEntries(
    header.split(";").map(v => v.trim().split("=").map(decodeURIComponent)).filter(([k]) => k)
  );
}

export async function middleware(req) {
  const url = new URL(req.url);
  const isApi = url.pathname.startsWith("/api/");
  const user = process.env.BASIC_AUTH_USER || "";
  const pass = process.env.BASIC_AUTH_PASS || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "set-a-secret";

  // If no admin creds configured, just let everything through.
  if (!user || !pass) return NextResponse.next();

  // 1) If we already have a valid cookie, let it through.
  const cookies = parseCookie(req.headers.get("cookie") || "");
  const cookieValue = cookies["admin_session"];
  if (cookieValue) {
    const [u, token] = cookieValue.split("|");
    const good = await edgeHash(`${u}:${pass}:${secret}`);
    if (u === user && token === good) return NextResponse.next();
  }

  // 2) If a Basic header is present and correct, set cookie and continue.
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    const [u, p] = Buffer.from(auth.slice(6), "base64").toString().split(":");
    if (u === user && p === pass) {
      const token = await edgeHash(`${user}:${pass}:${secret}`);
      const res = NextResponse.next();
      // 8 hours
      res.headers.append(
        "set-cookie",
        `admin_session=${encodeURIComponent(`${user}|${token}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`
      );
      return res;
    }
  }

  // 3) Otherwise, challenge with Basic (keeps the browser prompt on protected areas)
  const res = NextResponse.json(
    { ok: false, error: "Auth required" },
    { status: 401 }
  );
  res.headers.set('www-authenticate', 'Basic realm="Admin", charset="UTF-8"');
  return res;
}
