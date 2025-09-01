// lib/newsletter/store.ts
import { randomUUID, createHash } from "crypto";

/* =========================
   Types
   ========================= */

export type NewsletterSourceKey =
  | "blog"
  | "weeklyRecap"
  | "survivorPolls"
  | "holdem"
  | "sitStart"
  | "survivorLeaderboard";

// add two statuses, keep “draft” for backward compatibility
export type NewsletterStatus =
  | "draft"
  | "compiled"
  | "edited"
  | "scheduled"
  | "sent"
  | "archived"
  | "failed";

export type SourcePick = {
  key: NewsletterSourceKey;
  verbatim?: boolean;
};

export interface NewsletterDraft {
  id: string;
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  subject: string;
  markdown: string;    // compiled/editable content
  picks: SourcePick[]; // which sources were selected
  status: NewsletterStatus;
  scheduledAt?: string | null;
  audienceTag?: string | null;
  from?: string | null;
  /** Optional display title used by admin UI */
  title?: string;
}

/* =========================
   Storage (KV first, memory fallback)
   ========================= */

const IDX_KEY = "newsletter:drafts:index"; // string[] of ids
const KEY = (id: string) => `newsletter:draft:${id}`;
const SUBS_KEY = "newsletter:subs";        // string[] of emails (fallback storage)

type KVLike = {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<"OK" | void>;
  del(key: string): Promise<number | void>;
};

async function getKV(): Promise<KVLike | null> {
  try {
    const mod = await import("@vercel/kv");
    // Vercel KV exports `kv`
    return (mod as any).kv as KVLike;
  } catch {
    return null;
  }
}

// memory fallback (non-persistent; dev only)
const memDrafts = new Map<string, NewsletterDraft>();
let memIndex = new Set<string>();
let memSubs = new Set<string>();

async function idxGet(kv: KVLike | null): Promise<string[]> {
  if (kv) {
    const ids = await kv.get<string[]>(IDX_KEY);
    return Array.isArray(ids) ? ids : [];
  }
  return Array.from(memIndex);
}
async function idxSet(kv: KVLike | null, ids: string[]) {
  if (kv) await kv.set(IDX_KEY, ids);
  else memIndex = new Set(ids);
}
async function loadDraft(kv: KVLike | null, id: string): Promise<NewsletterDraft | null> {
  if (kv) return (await kv.get<NewsletterDraft>(KEY(id))) ?? null;
  return memDrafts.get(id) ?? null;
}
async function saveDraftKV(kv: KVLike | null, d: NewsletterDraft) {
  if (kv) await kv.set(KEY(d.id), d);
  else memDrafts.set(d.id, d);
}
async function deleteDraftKV(kv: KVLike | null, id: string) {
  if (kv) await kv.del(KEY(id));
  else memDrafts.delete(id);
}

/* =========================
   Drafts API
   ========================= */

export async function listDrafts(): Promise<NewsletterDraft[]> {
  const kv = await getKV();
  const ids = await idxGet(kv);
  const out: NewsletterDraft[] = [];
  for (const id of ids) {
    const d = await loadDraft(kv, id);
    if (d) out.push(d);
  }
  out.sort((a, b) => {
    const au = new Date(a.updatedAt || a.createdAt).valueOf();
    const bu = new Date(b.updatedAt || b.createdAt).valueOf();
    return bu - au;
  });
  return out;
}

export async function getDraft(id: string): Promise<NewsletterDraft | null> {
  const kv = await getKV();
  return await loadDraft(kv, id);
}

type SaveInput = Partial<NewsletterDraft> & {
  id?: string;
  subject?: string;
  markdown?: string;
  picks?: SourcePick[];
  scheduledAt?: string | null;
  audienceTag?: string | null;
  from?: string | null;
  title?: string;
};

export async function saveDraft(input: SaveInput): Promise<NewsletterDraft> {
  const kv = await getKV();
  const now = new Date().toISOString();

  let draft = input.id ? await loadDraft(kv, input.id) : null;

  if (!draft) {
    const id = input.id || randomUUID();
    draft = {
      id,
      createdAt: now,
      updatedAt: now,
      subject: input.subject || "Untitled newsletter",
      markdown: input.markdown || "",
      picks: input.picks || [],
      status: "draft",
      scheduledAt: input.scheduledAt ?? null,
      audienceTag: input.audienceTag ?? null,
      from: input.from ?? null,
      title: input.title || "Weekly Newsletter",
    };
    await saveDraftKV(kv, draft);
    const ids = await idxGet(kv);
    if (!ids.includes(id)) {
      ids.unshift(id);
      await idxSet(kv, ids);
    }
    return draft;
  }

  const next: NewsletterDraft = {
    ...draft,
    subject: input.subject ?? draft.subject,
    markdown: input.markdown ?? draft.markdown,
    picks: input.picks ?? draft.picks,
    scheduledAt: input.scheduledAt ?? draft.scheduledAt ?? null,
    audienceTag: input.audienceTag ?? draft.audienceTag ?? null,
    from: input.from ?? draft.from ?? null,
    title: input.title ?? draft.title,
    updatedAt: now,
  };
  await saveDraftKV(kv, next);
  return next;
}

export async function deleteDraft(id: string): Promise<void> {
  const kv = await getKV();
  await deleteDraftKV(kv, id);
  const ids = await idxGet(kv);
  const next = ids.filter((x) => x !== id);
  await idxSet(kv, next);
}

export async function markStatus(
  id: string,
  status: NewsletterStatus,
  extra?: Partial<Pick<NewsletterDraft, "scheduledAt">>
): Promise<NewsletterDraft | null> {
  const kv = await getKV();
  const existing = await loadDraft(kv, id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const next: NewsletterDraft = {
    ...existing,
    status,
    scheduledAt: extra?.scheduledAt ?? existing.scheduledAt ?? null,
    updatedAt: now,
  };
  await saveDraftKV(kv, next);
  return next;
}

/* =========================
   Subscribers API
   ========================= */

/**
 * Upsert a subscriber.
 * Tries Mailchimp (if configured), then falls back to KV (or in-memory).
 *
 * Required env for Mailchimp:
 * - MAILCHIMP_API_KEY (e.g. "abcd-us21")
 * - MAILCHIMP_LIST_ID
 * Optional:
 * - MAILCHIMP_DC (overrides DC parsed from API key suffix)
 */
export async function subscribeEmail(
  email: string,
  opts?: { tags?: string[]; source?: string }
): Promise<{ ok: true; via: "mailchimp" | "kv" } | { ok: false; error: string }> {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || !clean.includes("@")) return { ok: false, error: "invalid-email" };

  const MC_KEY = process.env.MAILCHIMP_API_KEY || "";
  const MC_LIST = process.env.MAILCHIMP_LIST_ID || "";
  const parsedDc = MC_KEY.includes("-") ? MC_KEY.split("-").at(-1) : "";
  const MC_DC = process.env.MAILCHIMP_DC || parsedDc || "";

  // 1) Mailchimp upsert
  if (MC_KEY && MC_LIST && MC_DC) {
    try {
      const hash = createHash("md5").update(clean).digest("hex");
      const url = `https://${MC_DC}.api.mailchimp.com/3.0/lists/${MC_LIST}/members/${hash}`;
      const body: any = {
        email_address: clean,
        status_if_new: "subscribed",
        status: "subscribed",
      };
      if (opts?.tags && opts.tags.length) body.tags = opts.tags;
      if (opts?.source) body.merge_fields = { SOURCE: opts.source };

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // Basic auth user can be any string, password is API key
          Authorization: `Basic ${Buffer.from(`anystring:${MC_KEY}`).toString("base64")}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Don’t hard-fail—fall back to KV
        console.warn("Mailchimp subscribe failed:", res.status, text);
      } else {
        return { ok: true, via: "mailchimp" };
      }
    } catch (err) {
      console.warn("Mailchimp subscribe error:", err);
      // fall through to KV
    }
  }

  // 2) KV fallback
  try {
    const kv = await getKV();
    if (kv) {
      const list = (await kv.get<string[]>(SUBS_KEY)) || [];
      if (!list.includes(clean)) {
        list.push(clean);
        await kv.set(SUBS_KEY, list);
      }
      return { ok: true, via: "kv" };
    } else {
      // in-memory (dev only)
      memSubs.add(clean);
      return { ok: true, via: "kv" };
    }
  } catch {
    return { ok: false, error: "subscribe-failed" };
  }
}
