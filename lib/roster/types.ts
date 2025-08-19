// lib/roster/types.ts

export type SlotKey = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DST" | "K";
export type Position = SlotKey;

export type RosterRules = {
  QB: number; RB: number; WR: number; TE: number; FLEX: number; DST: number; K: number;
};

export type ScoringProfile = "PPR" | "HALF_PPR" | "STD";

export type UserRoster = {
  id: string;
  email: string;
  name?: string;
  rules: RosterRules;
  players: string[];
  pins?: { FLEX?: string[] };
  scoring?: ScoringProfile;            // 👈 NEW
  optInEmail?: boolean;
  updatedAt: string;
};

export type SlotDetail = {
  playerId: string;
  position: SlotKey | "BENCH";
  points: number;
  confidence: number;
  tier: "A" | "B" | "C" | "D";
  note?: string;
  breakdown?: {                        // 👈 NEW (for explainability)
    scoring: ScoringProfile;
    base: number;                      // projection from API (per scoring)
    delta: number;                     // admin +/- points
    injury?: string;
    forcedStart?: boolean;
    forcedSit?: boolean;
  };
};

export type WeeklyLineup = {
  week: number;
  slots: Record<SlotKey, string[]>;
  bench: string[];
  details: Record<string, SlotDetail>;
  scores: number;                      // total projected points for starters
  recommendedAt: string;
  hash?: string;                       // used by cron to detect meaningful change
};

export type AdminOverrides = {
  week: number;
  note?: string;
  pointDelta?: Record<string, number>;
  forceStart?: Record<string, boolean>;
  forceSit?: Record<string, boolean>;
};

// Convenience type for admin inputs (no `week` inside payload)
export type OverridesInput = Omit<AdminOverrides, "week">;
