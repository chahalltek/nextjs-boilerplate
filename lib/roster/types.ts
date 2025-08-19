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
