// lib/roster/types.ts
export type SlotKey = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DST" | "K";
export type Position = SlotKey;

export type RosterRules = Record<Position, number>;

export type Pins = {
  FLEX?: string[];
};

export type SlotDetail = {
  playerId: string;
  position: SlotKey | "BENCH";
  points: number;
  confidence: number;
  tier: "A" | "B" | "C" | "D";
  note?: string;
};

export type WeeklyLineup = {
  week: number;
  slots: Record<SlotKey, string[]>;
  bench: string[];
  details: Record<string, SlotDetail>;
  scores: Record<string, number>;     // e.g. { total, QB, RB, WR, ... }
  recommendedAt: string;
  hash?: string;                      // ← NEW (for change detection)
};

export type UserRoster = {
  id: string;
  email: string;
  name?: string;
  rules: RosterRules;
  players: string[];
  updatedAt: string;
  pins?: Pins;
  _pos?: Record<string, Position>;
};

export type OverridesInput = {
  pointDelta?: Record<string, number>;
  forceStart?: Record<string, boolean>;
  forceSit?: Record<string, boolean>;
  note?: string;
};

export type AdminOverrides = OverridesInput & { week: number };
