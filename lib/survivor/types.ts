// lib/survivor/types.ts
export type Contestant = { id: string; name: string; tribe?: string; image?: string };
export type Season = {
  id: string;               // e.g. "S47"
  name: string;             // e.g. "Survivor 47"
  lockAt: string;           // ISO timestamp
  contestants: Contestant[];
  actualBootOrder: string[];    // contestant ids (append weekly)
  final3?: string[];            // [winner, second, third]
  juryVotes?: number;           // optional finale tiebreaker
};

export type Entry = {
  id: string;               // uuid
  seasonId: string;
  name: string;             // display name
  picks: {
    bootOrder: string[];    // full list of contestant ids
    final3: string[];       // [winner, second, third]
    juryVotes?: number;
  };
  submittedAt: string;      // ISO
  score?: number;
};
