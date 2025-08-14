// middleware.js
import { NextResponse } from "next/server";

// Protect only /admin
export const config = { matcher: ["/admin/:path*"] };

// --- helpers (Edge-safe) ---
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function expectedCookie() {
  const u = process.env.ADMIN_USER || "";
  const p = process.env.ADMIN_PASS || "";
  const s = process.env.ADMIN_SECRET || "fallback-secret";
  return sha256Hex(`${u}:${p}:${s}`);
}

export async function middleware(req) {
  const url = req.nextUrl;
  const cookieName = "skol-admin";
  const cookieVal = req.cookies.get(cookieName)?.value;
  const want = await expectedCookie();

  // If session cookie matches, allow
  if (cookieVal === want) return NextResponse.next();

  // Check Basic Auth header
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const [, b64] = auth.split(" ");
      const creds = atob(b64);
      const idx = creds.indexOf(":");
      const user = creds.slice(0, idx);
      const pass = creds.slice(idx + 1);

      if (user === (process.env.ADMIN_USER || "") && pass === (process.env.ADMIN_PASS || "")) {
        const res = NextResponse.next();
        // Set an 8-hour session cookie so you don't get re-prompted
        res.cookies.set(cookieName, want, {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/admin",
          maxAge: 60 * 60 * 8,
        });
        return res;
      }
    } catch {}
  }

  // Challenge
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Skol Admin"' },
  });
}
