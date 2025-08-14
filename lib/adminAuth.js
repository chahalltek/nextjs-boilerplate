// lib/adminAuth.js
import { cookies, headers } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "skol_admin";
const TTL = 60 * 60 * 12; // 12 hours

function reqHost() {
  const h = headers();
  return (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function makeSessionValue(user, secret) {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const payload = `${user}:${exp}`;
  const b64 = Buffer.from(payload, "utf8").toString("base64");
  const sig = sign(payload, secret);
  return `${b64}.${sig}`;
}

export function readSession() {
  const raw = cookies().get(COOKIE_NAME)?.value || "";
  if (!raw) return null;
  const [b64, sig] = raw.split(".");
  if (!b64 || !sig) return null;

  const payload = Buffer.from(b64, "base64").toString("utf8");
  const [user, expStr] = payload.split(":");
  if (!user || !expStr) return null;

  const secret = process.env.ADMIN_COOKIE_SECRET || "";
  if (!secret) return null;

  const goodSig = sign(payload, secret) === sig;
  const notExpired = Number(expStr) > Math.floor(Date.now() / 1000);
  if (!goodSig || !notExpired) return null;
  return { user, exp: Number(expStr) };
}

export function setSessionCookie(res, value) {
  res.cookies.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL,
  });
}

export function clearSessionCookie(res) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
}

export function requireAdminAuth() {
  // Allow only requests coming from our own host (light CSRF protection)
  const host = reqHost();
  if (!host) return { ok: false, reason: "missing-host" };

  const session = readSession();
  if (!session) return { ok: false, reason: "no-session" };

  return { ok: true, user: session.user };
}
