import { NextResponse } from "next/server";
import crypto from "node:crypto";

// ENV: set these in Vercel
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "change-me";

// Token lifetime (seconds)
const MAX_AGE = 60 * 60 * 12; // 12h

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// token format: user:timestamp:hash
function makeToken(user, pass, secret) {
  const ts = Date.now();
  const hash = sha256(`${user}:${pass}:${secret}:${ts}`);
  return `${user}:${ts}:${hash}`;
}

function parseCookieValue(req) {
  // NextRequest has cookies API
  const fromApi = req.cookies?.get?.("admin_session")?.value;
  if (fromApi) return fromApi;

  // Fallback generic Cookie header (rarely needed with NextRequest)
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)admin_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function validateSession(token) {
  try {
    if (!token) return false;
    const [user, tsStr, hash] = token.split(":");
    if (!user || !tsStr || !hash) return false;

    const ts = Number(tsStr);
    if (!Number.isFinite(ts)) return false;

    const ageSec = (Date.now() - ts) / 1000;
    if (ageSec > MAX_AGE) return false;

    const expect = sha256(`${user}:${ADMIN_PASS}:${ADMIN_SECRET}:${ts}`);
    // constant-time-ish compare
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expect));
  } catch {
    return false;
  }
}

export function validateSessionCookie(req) {
  const token = parseCookieValue(req);
  return validateSession(token);
}

function parseBasicHeader(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  try {
    const [user, pass] = Buffer.from(m[1], "base64").toString("utf8").split(":");
    if (!user || pass === undefined) return null;
    return { user, pass };
  } catch {
    return null;
  }
}

export function maybeIssueSessionFromAuthorization(req) {
  const creds = parseBasicHeader(req);
  if (!creds) return null;

  const ok = creds.user === ADMIN_USER && creds.pass === ADMIN_PASS;
  if (!ok) return null;

  const token = makeToken(ADMIN_USER, ADMIN_PASS, ADMIN_SECRET);
  const res = NextResponse.next();
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}

// For API route handlers: call this at the start and return if it yields a response
export function requireAdminAuth(request) {
  if (validateSessionCookie(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
