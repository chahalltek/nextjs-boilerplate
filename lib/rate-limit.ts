// lib/rate-limit.ts
import { kv } from "@vercel/kv";

/** Simple fixed-window limiter using INCR + EXPIRE.
 * identifier: unique key per user & action (e.g., `${ip}:hef:reply`)
 * limit: max requests per window seconds
 */
export async function rateLimit(
  identifier: string,
  { limit = 10, window = 60 }: { limit?: number; window?: number } = {}
) {
  const key = `rl:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  // increment
  const count = await kv.incr(key);
  // set window if first hit
  const ttl = await kv.ttl(key);
  if (ttl < 0) await kv.expire(key, window);

  const remaining = Math.max(0, limit - count);
  const reset = now + (ttl > 0 ? ttl : window);
  return {
    success: count <= limit,
    limit,
    remaining,
    reset, // epoch seconds when window resets
  };
}

/** Helper to extract best-effort IP from a Request */
export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
