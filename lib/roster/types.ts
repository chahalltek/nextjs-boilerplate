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
  scoring?: ScoringProfile;
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
  breakdown?: {
    scoring: ScoringProfile;
    base: number;
    delta: number;
    injury?: string;
    forcedStart?: boolean;
    forcedSit?: boolean;
    // NEW: matchup context
    oppRank?: number;                       // lower = tougher D (or reverse per API)
    matchupTier?: "Green" | "Yellow" | "Red";
  };
};

export type WeeklyLineup = {
  week: number;
  slots: Record<SlotKey, string[]>;
  bench: string[];
  details: Record<string, SlotDetail>;
  scores: number;
  recommendedAt: string;
  hash?: string;
};

export type AdminOverrides = {
  week: number;
  note?: string;
  pointDelta?: Record<string, number>;
  forceStart?: Record<string, boolean>;
  forceSit?: Record<string, boolean>;
};

export type OverridesInput = Omit<AdminOverrides, "week">;
