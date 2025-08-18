// lib/survivor/types.ts
export type Contestant = { id: string; name: string; tribe?: string; image?: string };
export type Season = {
  id: string;  // e.g., "S47"
  name: string;
  lockAt: string; // ISO
  contestants: Contestant[];
  actualBootOrder: string[]; // contestant ids, filled weekly
  final3?: string[]; // [winner, second, third]
  juryVotes?: number; // winner's final count
};

export type Entry = {
  id: string;        // uuid
  seasonId: string;
  name: string;      // player display name (or email hash)
  picks: {
    bootOrder: string[]; // length = contestants
    final3: string[];    // [winner, second, third]
    juryVotes?: number;
  };
  submittedAt: string; // ISO
  score?: number;
};
