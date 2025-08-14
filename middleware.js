// middleware.js
import { NextResponse } from "next/server";

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

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
  // Next can mark prefetches with any of these headers depending on version/browser
  const isPrefetch =
    req.headers.get("x-middleware-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("sec-purpose") === "prefetch";

  const cookieName = "skol-admin";
  const need = await cookieSignature();
  const have = req.cookies.get(cookieName)?.value;

  // If already authenticated, continue
  if (have === need) return NextResponse.next();

  // Never challenge background prefetches – just no-op them
  if (isPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  // Check Basic Auth for full navigations / API calls
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const creds = atob(auth.split(" ")[1]);
      const i = creds.indexOf(":");
      const user = creds.slice(0, i);
      const pass = creds.slice(i + 1);
      if (user === (process.env.ADMIN_USER || "") && pass === (process.env.ADMIN_PASS || "")) {
        const res = NextResponse.next();
        res.cookies.set(cookieName, need, {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",              // <-- important so /api/* gets it too
          maxAge: 60 * 60 * 8,    // 8 hours
        });
        return res;
      }
    } catch {}
  }

  // For APIs, return JSON (no WWW-Authenticate) to avoid browser dialog
  if (isApi) {
    return new NextResponse(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  // For pages, do a Basic Auth challenge
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Skol Admin"' },
  });
}
