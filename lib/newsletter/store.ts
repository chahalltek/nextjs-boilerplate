// lib/newsletter/store.ts
import { randomUUID } from "crypto";

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

export type NewsletterStatus = "draft" | "scheduled" | "sent" | "archived" | "failed";

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
  scheduledAt?: string | null; // ISO for later sending
  audienceTag?: string | null; // Mailchimp tag filter, optional
  from?: string | null;        // override from address, optional
}

/* =========================
   Storage (KV first, memory fallback)
   ========================= */

const IDX_KEY = "newsletter:drafts:index"; // stores string[] of ids
const KEY = (id: string) => `newsletter:draft:${id}`;

type KVLike = {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<"OK" | void>;
  del(key: string): Promise<number | void>;
};

async function getKV(): Promise<KVLike | null> {
  try {
    // Lazy import so build doesn't fail if @vercel/kv isn't installed locally
    const mod = await import("@vercel/kv");
    return mod.kv as KVLike;
  } catch {
    return null;
  }
}

// memory fallback (non-persistent)
const mem = new Map<string, NewsletterDraft>();
let memIndex = new Set<string>();

async function idxGet(kv: KVLike | null): Promise<string[]> {
  if (kv) {
    const ids = await kv.get<string[]>(IDX_KEY);
    return Array.isArray(ids) ? ids : [];
  }
  return Array.from(memIndex);
}

async function idxSet(kv: KVLike | null, ids: string[]) {
  if (kv) {
    await kv.set(IDX_KEY, ids);
  } else {
    memIndex = new Set(ids);
  }
}

async function loadDraft(kv: KVLike | null, id: string): Promise<NewsletterDraft | null> {
  if (kv) {
    const doc = await kv.get<NewsletterDraft>(KEY(id));
    return doc ?? null;
  }
  return mem.get(id) ?? null;
}

async function saveDraftKV(kv: KVLike | null, d: NewsletterDraft) {
  if (kv) {
    await kv.set(KEY(d.id), d);
  } else {
    mem.set(d.id, d);
  }
}

async function deleteDraftKV(kv: KVLike | null, id: string) {
  if (kv) {
    await kv.del(KEY(id));
  } else {
    mem.delete(id);
  }
}

/* =========================
   Public API
   ========================= */

export async function listDrafts(): Promise<NewsletterDraft[]> {
  const kv = await getKV();
  const ids = await idxGet(kv);
  const out: NewsletterDraft[] = [];
  for (const id of ids) {
    const d = await loadDraft(kv, id);
    if (d) out.push(d);
  }
  // newest updated first
  out.sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf());
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
};

export async function saveDraft(input: SaveInput): Promise<NewsletterDraft> {
  const kv = await getKV();

  let draft: NewsletterDraft | null = null;
  const now = new Date().toISOString();

  if (input.id) {
    draft = await loadDraft(kv, input.id);
  }

  if (!draft) {
    // create new
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
    };
    await saveDraftKV(kv, draft);
    const ids = await idxGet(kv);
    if (!ids.includes(id)) {
      ids.unshift(id);
      await idxSet(kv, ids);
    }
    return draft;
  }

  // update existing
  const next: NewsletterDraft = {
    ...draft,
    subject: input.subject ?? draft.subject,
    markdown: input.markdown ?? draft.markdown,
    picks: input.picks ?? draft.picks,
    scheduledAt: input.scheduledAt ?? draft.scheduledAt ?? null,
    audienceTag: input.audienceTag ?? draft.audienceTag ?? null,
    from: input.from ?? draft.from ?? null,
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
