// lib/subscribers/store.ts
// Unifies subscriber fetching. When audienceTag is provided and you use Mailchimp,
// we also fetch *member tags* (extra calls) and filter on the tag.

import crypto from "crypto";

export interface Subscriber {
  email: string;
  tags?: string[];
}

// ------------------ Mailchimp ------------------
// Needs: MAILCHIMP_API_KEY (contains -usX suffix) + MAILCHIMP_LIST_ID
async function fetchMailchimp(audienceTag?: string): Promise<Subscriber[]> {
  const key = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!key || !listId) return [];

  const dc = key.split("-")[1];
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const auth = { Authorization: `Basic ${Buffer.from(`any:${key}`).toString("base64")}` };

  // Page through list members (subscribed only)
  const res = await fetch(`${base}/lists/${listId}/members?status=subscribed&count=1000`, {
    headers: auth, cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({} as any));
  const members: any[] = json?.members ?? [];

  // If no audienceTag filtering: return quickly (no per-member tag fetch)
  if (!audienceTag) {
    return members.map((m) => ({ email: m.email_address }));
  }

  // Tag filtering requested -> fetch tags per member
  // GET /lists/{list_id}/members/{subscriber_hash}/tags
  // subscriber_hash is MD5 of lowercase email
  const wanted = audienceTag.toLowerCase();
  const limit = 8; // modest concurrency
  const out: Subscriber[] = [];
  let i = 0;

  async function fetchTagsFor(m: any) {
    const email: string = m.email_address;
    const hash = crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
    const r = await fetch(`${base}/lists/${listId}/members/${hash}/tags`, {
      headers: auth, cache: "no-store",
    });
    if (!r.ok) return;
    const body = await r.json().catch(() => ({} as any));
    const tags = (body?.tags ?? [])
      .filter((t: any) => t?.status === "active")
      .map((t: any) => String(t?.name || "").toLowerCase());
    if (tags.includes(wanted)) {
      out.push({ email, tags });
    }
  }

  // simple concurrency pool
  async function pool() {
    while (i < members.length) {
      const chunk = members.slice(i, i + limit);
      i += limit;
      await Promise.all(chunk.map(fetchTagsFor));
    }
  }
  await pool();
  return out;
}

// ------------------ Buttondown (optional fallback) ------------------
async function fetchButtondown(): Promise<Subscriber[]> {
  const key = process.env.BUTTONDOWN_API_KEY;
  if (!key) return [];
  const out: Subscriber[] = [];
  let next: string | null = "https://api.buttondown.email/v1/subscribers?status=active";
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Token ${key}` }, cache: "no-store" });
    if (!res.ok) break;
    const json = await res.json().catch(() => ({} as any));
    for (const s of json?.results ?? []) out.push({ email: s.email, tags: s.tags || [] });
    next = json?.next ?? null;
  }
  return out;
}

// ------------------ MailerLite (optional fallback) ------------------
async function fetchMailerLite(): Promise<Subscriber[]> {
  const key = process.env.MAILERLITE_API_KEY;
  if (!key) return [];
  const res = await fetch("https://connect.mailerlite.com/api/subscribers?limit=1000", {
    headers: { Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({} as any));
  return (json?.data ?? []).map((s: any) => ({
    email: s.email,
    tags: (s.fields?.tags || s.tags || []).map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean),
  }));
}

// ------------------ JSON fallback (optional) ------------------
async function fetchFromJson(): Promise<Subscriber[]> {
  const url = process.env.SUBSCRIBERS_JSON_URL;
  if (!url) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({} as any));
  if (Array.isArray(json)) return json.map((e) => ({ email: String(e) }));
  if (Array.isArray(json?.emails)) return json.emails.map((e: any) => ({ email: String(e) }));
  return [];
}

export async function listSubscribers(audienceTag?: string): Promise<Subscriber[]> {
  // Prefer Mailchimp per your stack
  const stacks = await Promise.all([
    fetchMailchimp(audienceTag),
    fetchButtondown(),
    fetchMailerLite(),
    fetchFromJson(),
  ]);

  // Merge & de-dup
  const map = new Map<string, Subscriber>();
  for (const arr of stacks) {
    for (const s of arr) {
      const key = s.email.toLowerCase();
      const prev = map.get(key);
      const tags = [...new Set([...(prev?.tags ?? []), ...(s.tags ?? [])])];
      map.set(key, { email: s.email, tags: tags.length ? tags : undefined });
    }
  }
  return Array.from(map.values());
}
