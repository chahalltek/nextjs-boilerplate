// lib/survivor/store.ts
import { kv } from "@vercel/kv";
// ❌ remove: import { v4 as uuid } from "uuid";
import { randomUUID } from "crypto";          // ✅ add
import type { Season, Entry } from "./types";
import { scoreEntry } from "./score";

// ...unchanged...

export async function upsertEntry(
  season: Season,
  data: Omit<Entry, "id" | "submittedAt" | "score"> & { id?: string }
) {
  const now = new Date();
  if (now >= new Date(season.lockAt)) throw new Error("Picks are locked");

  const id = data.id ?? randomUUID();        // ✅ use built-in UUID

  const entry: Entry = {
    id,
    seasonId: season.id,
    name: data.name?.trim() || "Anonymous",
    picks: data.picks,
    submittedAt: new Date().toISOString(),
  };

  await kv.set(kEntry(season.id, id), entry);
  await kv.sadd(kEntries(season.id), id);
  await kv.zadd(kLB(season.id), { member: id, score: 0 });
  return entry;
}
