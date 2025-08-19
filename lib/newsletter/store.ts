// lib/newsletter/store.ts
import { kv } from "@vercel/kv";

const kSubs = "nl:subs";

function norm(email: string | undefined | null): string | null {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  return e.includes("@") ? e : null;
}

/** Idempotent subscribe; returns true if an email was added or already present */
export async function subscribeEmail(email: string | undefined | null): Promise<boolean> {
  const e = norm(email);
  if (!e) return false;
  try {
    await kv.sadd(kSubs, e);
    return true;
  } catch {
    return false;
  }
}
