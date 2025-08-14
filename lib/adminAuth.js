// lib/adminAuth.js
import { cookies } from "next/headers";

const COOKIE_NAME = "ss_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export function issueAdminSession() {
  cookies().set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearAdminSession() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export function isAuthed() {
  return cookies().get(COOKIE_NAME)?.value === "1";
}

/**
 * Use at the top of admin API routes.
 * If not authed, returns a Response (403). If authed, returns null.
 */
export function requireAdminAuth() {
  if (isAuthed()) return null;
  return new Response("Forbidden", { status: 403 });
}
