// lib/adminAuth.js
import crypto from "crypto";
import { cookies as getCookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "skol_admin";

const SECRET = process.env.ADMIN_SESSION_SECRET || "dev-secret-change-me";

/* --- signing helpers --- */
function hmac(input) {
  return crypto.createHmac("sha256", SECRET).update(input).digest("hex");
}
function makeToken(username) {
  // payload: user:timestamp
  const payload = `${username}:${Math.floor(Date.now() / 1000)}`;
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}
function parseToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expect = hmac(payload);
  // timing-safe compare
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  const [user] = payload.split(":");
  return { user };
}

/* --- cookie helpers --- */
export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, // 12h
  };
}

/* --- session helpers available to route handlers --- */
export function readSession() {
  const token = getCookies().get(ADMIN_COOKIE)?.value;
  return parseToken(token || "");
}

export function requireAdmin() {
  const s = readSession();
  if (!s) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/* --- credentials check (env-driven) --- */
export function isValidCredentials(username, password) {
  const u = process.env.ADMIN_USER || "admin";
  const p = process.env.ADMIN_PASS || "password";
  return username === u && password === p;
}

/* --- issue & clear --- */
export function issueSession(username) {
  return makeToken(username);
}
