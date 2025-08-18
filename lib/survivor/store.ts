// lib/survivor/store.ts
import { kv } from "@vercel/kv";
import { v4 as uuid } from "uuid";
import type { Season, Entry } from "./types";
import { scoreEntry } from "./score";

// Key helpers
const kSeason   = (seasonId: string) => `sv:season:${seasonId}`;            // hash/json
const kEntries  = (seasonId: string) => `sv:entries:${seasonId}`;           // set of entryIds
const kEntry    = (seasonId: string, entryId: string) => `sv:entry:${seasonId}:${entryId}`; // json
const kLB       = (seasonId: string) => `sv:lb:${seasonId}`;                 // zset entryId -> score

export async function getSeason(seasonId: string): Promise<Season | null> {
  return (await kv.get<Season>(kSeason(seasonId))) ?? null;
}

export async function setSeason(season: Season) {
  await kv.set(kSeason(season.id), season);
}

export async function appendBoot(seasonId: string, bootId: string) {
  const season = await getSeason(seasonId);
  if (!season) throw new Error("Season not found");
  if (season.actualBootOrder.includes(bootId)) return;
  season.actualBootOrder.push(bootId);
  await kv.set(kSeason(seasonId), season);
}

export async function upsertEntry(season: Season, data: Omit<Entry, "id"|"submittedAt"|"score"> & { id?: string }) {
  const now = new Date();
  if (now >= new Date(season.lockAt)) throw new Error("Picks are locked");

  const id = data.id ?? uuid();
  const entry: Entry = {
    id,
    seasonId: season.id,
    name: data.name?.trim() || "Anonymous",
    picks: data.picks,
    submittedAt: new Date().toISOString(),
  };

  await kv.set(kEntry(season.id, id), entry);
  await kv.sadd(kEntries(season.id), id);
  // initial score (0 until first boots recorded)
  await kv.zadd(kLB(season.id), { member: id, score: 0 });
  return entry;
}

export async function getEntry(seasonId: string, entryId: string) {
  return kv.get<Entry>(kEntry(seasonId, entryId));
}

export async function listEntryIds(seasonId: string) {
  return (await kv.smembers<string>(kEntries(seasonId))) ?? [];
}

export async function recomputeLeaderboard(seasonId: string) {
  const season = await getSeason(seasonId);
  if (!season) throw new Error("Season not found");
  const ids = await listEntryIds(seasonId);
  if (!ids.length) return [];

  const entries = (await Promise.all(ids.map((id) => getEntry(seasonId, id)))).filter(Boolean) as Entry[];
  const scored = entries.map((e) => ({ id: e.id, name: e.name, score: scoreEntry(season, e) }));

  // Update entry docs (with score) + leaderboard zset
  await Promise.all(
    scored.map(async (s) => {
      const entry = entries.find((e) => e.id === s.id)!;
      entry.score = s.score;
      await kv.set(kEntry(seasonId, s.id), entry);
      await kv.zadd(kLB(seasonId), { member: s.id, score: s.score });
    })
  );

  return scored.sort((a, b) => b.score - a.score);
}

export async function topLeaderboard(seasonId: string, limit = 100) {
  // high → low
  const members = await kv.zrevrange<string[]>(kLB(seasonId), 0, limit - 1, { withScores: true });
  // members is [id, score, id, score, ...]
  const out: { id: string; score: number; name: string }[] = [];
  for (let i = 0; i < members.length; i += 2) {
    const id = members[i] as unknown as string;
    const score = Number(members[i + 1]);
    const e = await getEntry(seasonId, id);
    out.push({ id, score, name: e?.name ?? "Unknown" });
  }
  return out;
}
