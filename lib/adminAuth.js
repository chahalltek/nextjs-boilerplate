// lib/adminAuth.js
import crypto from "crypto";

export function getAdminFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(v => v.trim().split("=").map(decodeURIComponent)).filter(([k]) => k)
  );
  const session = cookies["admin_session"];
  if (!session) return null;

  const [u, token] = session.split("|");
  const user = process.env.BASIC_AUTH_USER || "";
  const pass = process.env.BASIC_AUTH_PASS || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "set-a-secret";

  if (!user || !pass) return null;

  const good = crypto.createHash("sha256").update(`${user}:${pass}:${secret}`).digest("base64");
  if (u === user && token === good) return user;
  return null;
}

// Convenience gate for API routes
export function requireAdmin(request) {
  const u = getAdminFromRequest(request);
  if (!u) {
    return new Response("Forbidden", { status: 403 });
  }
  return null; // OK
}
