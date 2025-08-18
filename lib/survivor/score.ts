// lib/survivor/score.ts
import type { Season, Entry } from "./types";

export function scoreEntry(season: Season, entry: Entry): number {
  const actual = season.actualBootOrder;
  const predicted = entry.picks.bootOrder;
  let score = 0;

  // Weekly scoring for boots we know so far
  for (let i = 0; i < actual.length; i++) {
    const bootId = actual[i];
    const predictedIdx = predicted.indexOf(bootId);
    if (predictedIdx === -1) continue;
    const diff = Math.abs(predictedIdx - i);
    if (diff === 0) score += 5;
    else if (diff === 1) score += 2;
    else if (diff <= 3) score += 1;
  }

  // Finale bonuses
  if (season.final3?.length === 3 && entry.picks.final3?.length === 3) {
    const [w1, w2, w3] = season.final3;
    const [p1, p2, p3] = entry.picks.final3;
    if (p1 === w1) score += 10;
    if (p1 === w1 && p2 === w2 && p3 === w3) score += 6;
  }
  return score;
}
