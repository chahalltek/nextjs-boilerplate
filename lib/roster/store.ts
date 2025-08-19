// lib/roster/store.ts
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";
import type { UserRoster, RosterRules, WeeklyLineup, AdminOverrides } from "./types";

const kUsers = "ro:users";
const kRoster = (id: string) => `ro:roster:${id}`;
const kLineup = (id: string, week: number) => `ro:lineup:${id}:${week}`;
const kOverrides = (week: number) => `ro:overrides:${week}`;

/* -------------------- Rosters -------------------- */
export async function createRoster(input: {
  email: string;
  name?: string;
  rules?: Partial<RosterRules>;
  players?: string[];
}): Promise<UserRoster> {
  const id = randomUUID();
  const roster: UserRoster = {
    id,
    email: input.email.trim().toLowerCase(),
    name: input.name?.trim(),
    rules: {
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1,
      ...(input.rules || {}),
    },
    players: input.players || [],
    updatedAt: new Date().toISOString(),
  };
  await kv.set(kRoster(id), roster);
  await kv.sadd(kUsers, id);
  return roster;
}

export async function getRoster(id: string): Promise<UserRoster | null> {
  return (await kv.get<UserRoster>(kRoster(id))) ?? null;
}

export async function saveRoster(id: string, patch: Partial<UserRoster>): Promise<UserRoster> {
  const current = await getRoster(id);
  if (!current) throw new Error("roster not found");
  const next: UserRoster = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await kv.set(kRoster(id), next);
  return next;
}

/** Returns all roster IDs (defensively normalized to an array). */
export async function listRosterIds(): Promise<string[]> {
  const res: unknown = await kv.smembers(kUsers);
  if (Array.isArray(res)) return res as string[];
  if (typeof res === "string") return [res];
  return [];
}

/* -------------------- Lineups -------------------- */
export async function saveLineup(id: string, week: number, lu: WeeklyLineup): Promise<WeeklyLineup> {
  await kv.set(kLineup(id, week), lu);
  return lu;
}

export async function getLineup(id: string, week: number): Promise<WeeklyLineup | null> {
  return (await kv.get<WeeklyLineup>(kLineup(id, week))) ?? null;
}

/* -------------------- Admin overrides -------------------- */
export async function getOverrides(week: number): Promise<AdminOverrides> {
  return (await kv.get<AdminOverrides>(kOverrides(week))) ?? { week };
}

export async function setOverrides(week: number, o: AdminOverrides): Promise<AdminOverrides> {
  await kv.set(kOverrides(week), { week, ...o });
  return getOverrides(week);
}
