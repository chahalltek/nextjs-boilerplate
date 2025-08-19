export type SlotKey = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DST" | "K";

export type RosterRules = {
  QB: number; RB: number; WR: number; TE: number; FLEX: number; DST: number; K: number;
};

export interface UserRoster {
  id: string;
  email: string;
  name?: string;
  rules: RosterRules;
  players: string[];          // Sleeper player_ids (or team abbrev for DST)
  updatedAt: string;
}

export interface WeeklyLineup {
  week: number;
  slots: Record<SlotKey, string[]>;      // e.g. { QB:["x"], RB:["a","b"], FLEX:["c"], ... }
  bench: string[];
  scores: Record<string, number>;        // player_id -> adjusted pts
  explain?: Record<string, string>;      // player_id -> reason
}

export type AdminOverrides = {
  week: number;
  pointDelta?: Record<string, number>;   // +/− pts by player_id
  forceStart?: Record<string, boolean>;  // force into lineup anywhere (eligible)
  forceSit?: Record<string, boolean>;    // always bench
  note?: string;
};

export type Position = "QB"|"RB"|"WR"|"TE"|"FLEX"|"DST"|"K";

export interface RosterRules {
  QB:number; RB:number; WR:number; TE:number; FLEX:number; DST:number; K:number;
}

export interface UserRoster {
  id: string;
  email: string;
  name?: string;
  rules: RosterRules;
  players: string[];
  updatedAt: string;
  /** Per-user preferences */
  pins?: { FLEX?: string[] };     // player_ids the user prefers in FLEX
  optInEmail?: boolean;           // digest opt-in
}

export interface SlotDetail {
  playerId: string;
  position: Position | "BENCH";
  points: number;
  confidence: number;   // 0..1
  tier: "A"|"B"|"C"|"D";
  note?: string;        // e.g. injury, override
}

export interface WeeklyLineup {
  week: number;
  slots: Record<Exclude<Position, "FLEX"> | "FLEX", string[]>;
  bench?: string[];
  details?: Record<string, SlotDetail>;
  recommendedAt: string;
  hash?: string;        // for email change detection
}

export interface AdminOverrides {
  note?: string;
  pointDelta?: Record<string, number>;
  forceStart?: Record<string, boolean>;
  forceSit?: Record<string, boolean>;
}

export interface OverridesInput {
  note?: string;
  pointDelta?: Record<string, number>;
  forceStart?: Record<string, boolean>;
  forceSit?: Record<string, boolean>;
}

