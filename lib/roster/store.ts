// lib/roster/store.ts
import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";
import type {
  UserRoster,
  RosterRules,
  WeeklyLineup,
  AdminOverrides,
  ScoringProfile,
} from "./types";

// ---------- Keys ----------
const kRoster = (id: string) => `ro:roster:${id}`;
const kRosterIds = "ro:roster:ids"; // set of roster ids
const kLineup = (id: string, week: number) => `ro:lineup:${id}:${week}`;
const kOverrides = (week: number) => `ro:overrides:${week}`;
const kLineupNames = (id: string, week: number) => `ro:lineup:names:${id}:${week}`;
const kLineupIdx = (id: string) => `ro:lineup:index:${id}`;

// ---------- Rules helpers ----------
const defaultRules: RosterRules = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1 };

function mergeRules(partial?: Partial<RosterRules>): RosterRules {
  return {
    QB: partial?.QB ?? defaultRules.QB,
    RB: partial?.RB ?? defaultRules.RB,
    WR: partial?.WR ?? defaultRules.WR,
    TE: partial?.TE ?? defaultRules.TE,
    FLEX: partial?.FLEX ?? defaultRules.FLEX,
    DST: partial?.DST ?? defaultRules.DST,
    K: partial?.K ?? defaultRules.K,
  };
}

function nowISO() {
  return new Date().toISOString();
}

// ---------- Roster CRUD ----------
export async function listRosterIds(): Promise<string[]> {
  try {
    const ids = await kv.smembers<string>(kRosterIds);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export async function getRoster(id: string): Promise<UserRoster | null> {
  try {
    const obj = await kv.get<UserRoster>(kRoster(id));
    return obj || null;
  } catch {
    return null;
  }
}

// Minimal roster meta for admin/email flows (non-player map)
export type RosterMeta = Pick<UserRoster, "id" | "name" | "email">;

export async function getRosterMeta(id: string): Promise<RosterMeta | null> {
  const r = await getRoster(id);
  if (!r) return null;
  return { id: r.id, name: r.name || "", email: r.email || "" };
}

export async function createRoster(input: {
  email: string;
  name?: string;
  rules?: Partial<RosterRules>;
  players?: string[];
  pins?: { FLEX?: string[] };
  scoring?: ScoringProfile;
  optInEmail?: boolean;
}): Promise<UserRoster> {
  const id = randomUUID();
  const roster: UserRoster = {
    id,
    email: input.email,
    name: input.name || "",
    players: input.players || [],
    rules: mergeRules(input.rules),
    pins: input.pins || {},
    scoring: input.scoring || "PPR",
    optInEmail: input.optInEmail !== false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await kv.set(kRoster(id), roster);
  await kv.sadd(kRosterIds, id);
  return roster;
}

export async function saveRoster(id: string, patch: Partial<UserRoster>): Promise<UserRoster> {
  const existing = await getRoster(id);
  if (!existing) throw new Error("Roster not found");
  const next: UserRoster = {
    ...existing,
    ...(patch as any),
    rules: mergeRules(patch.rules ?? existing.rules),
    updatedAt: nowISO(),
  };
  await kv.set(kRoster(id), next);
  return next;
}

// ---------- Lineups ----------
export async function getLineup(
  id: string,
  week: number
): Promise<(WeeklyLineup & { hash?: string }) | null> {
  try {
    const lu = await kv.get<WeeklyLineup & { hash?: string }>(kLineup(id, week));
    return lu || null;
  } catch {
    return null;
  }
}

export async function saveLineup(
  id: string,
  week: number,
  lineup: WeeklyLineup & { hash?: string }
): Promise<void> {
  await kv.set(kLineup(id, week), lineup);
}

/**
 * Convenience saver used by cron/recompute flows.
 * Also maintains a sorted index of computed weeks per roster.
 */
export async function saveWeeklyLineup(
  id: string,
  week: number,
  lineup: WeeklyLineup
): Promise<void> {
  await kv.set(kLineup(id, week), lineup);
  await kv.zadd(kLineupIdx(id), { score: week, member: String(week) });
}

// ---------- Overrides ----------
export type OverridesInput = Partial<Pick<AdminOverrides, "pointDelta" | "forceStart" | "forceSit" | "note">>;

export async function getOverrides(week: number): Promise<AdminOverrides> {
  try {
    const o = (await kv.get<AdminOverrides>(kOverrides(week))) || null;
    return (
      o || {
        week,
        pointDelta: {},
        forceStart: {},
        forceSit: {},
        note: "",
      }
    );
  } catch {
    return { week, pointDelta: {}, forceStart: {}, forceSit: {}, note: "" };
  }
}

export async function setOverrides(week: number, input: OverridesInput): Promise<AdminOverrides> {
  const current = await getOverrides(week);
  const merged: AdminOverrides = {
    week,
    pointDelta: { ...(current.pointDelta || {}), ...(input.pointDelta || {}) },
    forceStart: { ...(current.forceStart || {}), ...(input.forceStart || {}) },
    forceSit: { ...(current.forceSit || {}), ...(input.forceSit || {}) },
    note: input.note ?? current.note ?? "",
  };
  await kv.set(kOverrides(week), merged);
  return merged;
}

// ---------- Names map for emails/UI ----------
export async function setLineupNames(
  id: string,
  week: number,
  map: Record<string, { name: string; pos?: string; team?: string }>
): Promise<void> {
  await kv.set(kLineupNames(id, week), map || {});
}

export async function getLineupNames(
  id: string,
  week: number
): Promise<Record<string, { name: string; pos?: string; team?: string }>> {
  try {
    return (
      (await kv.get<Record<string, { name: string; pos?: string; team?: string }>>(
        kLineupNames(id, week)
      )) || {}
    );
  } catch {
    return {};
  }
}
