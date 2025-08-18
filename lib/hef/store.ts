// lib/hef/store.ts
import { kv } from "@vercel/kv";

export const HEF_EMOJI = ["🔥","👍","👎","🤔","💯"] as const;
export type HEmoji = (typeof HEF_EMOJI)[number];

export type HThread = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export type HReply = {
  id: string;
  threadId: string;
  name: string;
  message: string;
  createdAt: string;
};

const kCurrent = "hef:thread:current";
const kThread = (id: string) => `hef:thread:${id}`;
const kReplies = (id: string) => `hef:replies:${id}`; // list of reply ids
const kReply = (id: string) => `hef:reply:${id}`;
const kReact = (id: string, e: HEmoji) => `hef:react:${id}:${e}`;

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function createThread(input: { title: string; body: string }) {
  const t: HThread = { id: uid(), title: input.title.trim(), body: input.body.trim(), createdAt: new Date().toISOString() };
  await kv.set(kThread(t.id), t);
  await kv.set(kCurrent, t.id);
  return t;
}

export async function getCurrentThread(): Promise<HThread | null> {
  const id = await kv.get<string>(kCurrent);
  if (!id) return null;
  return (await kv.get<HThread>(kThread(id))) ?? null;
}

export async function addReply(threadId: string, name: string, message: string) {
  const r: HReply = { id: uid(), threadId, name: (name || "Anonymous").trim(), message: message.trim(), createdAt: new Date().toISOString() };
  await kv.set(kReply(r.id), r);
  await kv.rpush(kReplies(threadId), r.id);
  return r;
}

export async function listReplies(threadId: string): Promise<HReply[]> {
  const ids = (await kv.lrange<string>(kReplies(threadId), 0, -1)) ?? [];
  if (!ids.length) return [];
  const out: HReply[] = [];
  for (const id of ids) {
    const r = await kv.get<HReply>(kReply(id));
    if (r) out.push(r);
  }
  // newest first
  out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return out;
}

export async function incReaction(threadId: string, emoji: HEmoji) {
  return kv.incr(kReact(threadId, emoji));
}

export async function getReactions(threadId: string): Promise<Record<HEmoji, number>> {
  const out = {} as Record<HEmoji, number>;
  await Promise.all(
    HEF_EMOJI.map(async (e) => {
      const v = (await kv.get<number>(kReact(threadId, e))) ?? 0;
      out[e] = v;
    })
  );
  return out;
}
