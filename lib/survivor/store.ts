// lib/survivor/store.ts
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto"; // native UUID (no extra deps)
import type { Season, Entry } from "./types";
import { scoreEntry } from "./score";

/* ---------- Key helpers ---------- */
const kSeason = (sid: string) => `sv:season:${sid}`;
const kEntries = (sid: string) => `sv:entries:${sid}`;                 // SET of entryIds
const kEntry  = (sid: string, eid: string) => `sv:entry:${sid}:${eid}`;
const kLB     = (sid: string) => `sv:lb:${sid}`;                       // ZSET (member: entryId, score)

/* ---------- Season ---------- */
export async function getSeason(seasonId: string): Promise<Season | null> {
  return (await kv.get<Season>(kSeason(seasonId))) ?? null;
}

// (optional admin setter; keep if you seed seasons programmatically)
export async function setSeason(season: Season): Promise<void> {
  await kv.set(kSeason(season.id), season);
}

/* ---------- Entries ---------- */
export async function upsertEntry(
  season: Season,
  data: Omit<Entry, "id" | "submittedAt" | "score"> & { id?: string }
): Promise<Entry> {
  // lock: no new/updated entries after lockAt
  const now = new Date();
  if (now >= new Date(season.lockAt)) {
    throw new Error("Picks are locked");
  }

  const id = data.id ?? randomUUID();

  const entry: Entry = {
    id,
    seasonId: season.id,
    name: (data.name || "Anonymous").trim(),
    picks: data.picks,
    submittedAt: new Date().toISOString(),
  };

  await kv.set(kEntry(season.id, id), entry);
  await kv.sadd(kEntries(season.id), id);

  // initialize/refresh leaderboard score for this entry
  const score = scoreEntry(entry, season);
  await kv.zadd(kLB(season.id), { member: id, score });

  return entry;
}

export async function getEntries(seasonId: string): Promise<Entry[]> {
  const ids = (await kv.smembers<string>(kEntries(seasonId))) ?? [];
  if (!ids.length) return [];
  // mget isn’t guaranteed to exist in all KV SDK versions; simple loop is fine here
  const out: Entry[] = [];
  for (const id of ids) {
    const e = await kv.get<Entry>(kEntry(seasonId, id));
    if (e) out.push(e);
  }
  return out;
}

/* ---------- Leaderboard ---------- */
export async function recomputeLeaderboard(seasonId: string): Promise<number> {
  const season = await getSeason(seasonId);
  if (!season) throw new Error("season not found");

  const entries = await getEntries(seasonId);
  if (!entries.length) {
    // clear ZSET if no entries
    await kv.del(kLB(seasonId));
    return 0;
  }

  // recompute all scores and write to ZSET
  const pairs = entries.map(e => ({ member: e.id, score: scoreEntry(e, season) }));
  // @vercel/kv accepts array form for zadd in recent versions; if not, do sequential writes
  for (const p of pairs) {
    await kv.zadd(kLB(seasonId), p);
  }
  return pairs.length;
}

export async function topLeaderboard(
  seasonId: string,
  limit = 200
): Promise<Array<{ id: string; name: string; score: number }>> {
  const season = await getSeason(seasonId);
  if (!season) return [];

  // Easiest + API-stable: compute from entries, then sort and slice
  const entries = await getEntries(seasonId);
  const rows = entries.map(e => ({
    id: e.id,
    name: e.name,
    score: scoreEntry(e, season),
  }));
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return rows.slice(0, limit);
}

/* ---------- Admin helpers ---------- */
export async function appendBoot(seasonId: string, contestantId: string): Promise<Season> {
  const season = await getSeason(seasonId);
  if (!season) throw new Error("season not found");

  const already = new Set(season.actualBootOrder || []);
  if (!already.has(contestantId)) {
    season.actualBootOrder = [...already, contestantId] as string[];
    await kv.set(kSeason(seasonId), season);
    await recomputeLeaderboard(seasonId);
  }
  return season;
}
