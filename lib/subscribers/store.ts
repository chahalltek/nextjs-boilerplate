// lib/subscribers/store.ts
// Unifies subscriber fetching across providers. Returns { email, tags? }[]

export interface Subscriber {
  email: string;
  tags?: string[];
}

// BUTTONDOWN ---------------------------------------------------------------
// Docs: https://buttondown.email/developers (Bearer: Token <key>)
async function fetchButtondown(): Promise<Subscriber[]> {
  const key = process.env.BUTTONDOWN_API_KEY;
  if (!key) return [];
  const out: Subscriber[] = [];
  let next: string | null = "https://api.buttondown.email/v1/subscribers?status=active";
  while (next) {
    const res = await fetch(next, {
      headers: { Authorization: `Token ${key}` },
      cache: "no-store",
    });
    if (!res.ok) break;
    const json = await res.json().catch(() => ({} as any));
    for (const s of json?.results ?? []) {
      out.push({ email: s.email, tags: s.tags || [] });
    }
    next = json?.next ?? null;
  }
  return out;
}

// MAILERLITE ---------------------------------------------------------------
// Docs: https://developers.mailerlite.com/docs/subscribers
async function fetchMailerLite(): Promise<Subscriber[]> {
  const key = process.env.MAILERLITE_API_KEY;
  if (!key) return [];
  const res = await fetch("https://connect.mailerlite.com/api/subscribers?limit=1000", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({} as any));
  return (json?.data ?? []).map((s: any) => ({
    email: s.email,
    tags: (s.fields?.tags || s.tags || []).map((t: any) => (typeof t === "string" ? t : t?.name)).filter(Boolean),
  }));
}

// MAILCHIMP ----------------------------------------------------------------
// Needs: MAILCHIMP_API_KEY (has -usX dc suffix) + MAILCHIMP_LIST_ID
async function fetchMailchimp(): Promise<Subscriber[]> {
  const key = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!key || !listId) return [];
  const dc = key.split("-")[1];
  const res = await fetch(
    `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members?status=subscribed&count=1000`,
    { headers: { Authorization: `Basic ${Buffer.from(`any:${key}`).toString("base64")}` }, cache: "no-store" }
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({} as any));
  // Mailchimp "tags" require another call per member; we skip tags here
  return (json?.members ?? []).map((m: any) => ({ email: m.email_address }));
}

// FALLBACK: static JSON url (e.g., your DB API) ----------------------------
// Set SUBSCRIBERS_JSON_URL=https://.../subscribers.json { emails:[], tags?:{} }
async function fetchFromJson(): Promise<Subscriber[]> {
  const url = process.env.SUBSCRIBERS_JSON_URL;
  if (!url) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({} as any));
  if (Array.isArray(json)) {
    return json.map((e) => ({ email: String(e) }));
  }
  if (Array.isArray(json?.emails)) {
    return json.emails.map((e: any) => ({ email: String(e) }));
  }
  return [];
}

export async function listSubscribers(audienceTag?: string): Promise<Subscriber[]> {
  const stacks = await Promise.all([
    fetchButtondown(),
    fetchMailerLite(),
    fetchMailchimp(),
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
  let all = Array.from(map.values());
  if (audienceTag) {
    const tag = audienceTag.toLowerCase();
    all = all.filter((s) => (s.tags || []).map((t) => String(t).toLowerCase()).includes(tag));
  }
  return all;
}
