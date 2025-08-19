// lib/roster/types.ts

export type SlotKey = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DST" | "K";
export type Position = SlotKey;

export type RosterRules = Record<Position, number>;

export type Pins = {
  FLEX?: string[]; // player_ids pinned to FLEX
};

export type SlotDetail = {
  playerId: string;
  position: SlotKey | "BENCH";
  points: number;            // projected (after deltas)
  confidence: number;        // 0..1
  tier: "A" | "B" | "C" | "D";
  note?: string;             // injury/status, etc.
};

export type WeeklyLineup = {
  week: number;
  slots: Record<SlotKey, string[]>; // ids per slot
  bench: string[];                  // remaining ids
  details: Record<string, SlotDetail>;
  // Per-slot sums plus a grand total (e.g. { total, QB, RB, WR, TE, FLEX, DST, K })
  scores: Record<string, number>;
  recommendedAt: string;
};

export type UserRoster = {
  id: string;
  email: string;
  name?: string;
  rules: RosterRules;
  players: string[];
  updatedAt: string;
  pins?: Pins;
  _pos?: Record<string, Position>; // optional cached position per player_id
};

export type OverridesInput = {
  pointDelta?: Record<string, number>;   // player_id -> delta points
  forceStart?: Record<string, boolean>;  // player_id -> true
  forceSit?: Record<string, boolean>;    // player_id -> true
  note?: string;
};

export type AdminOverrides = OverridesInput & {
  week: number;
};
