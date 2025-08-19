/** Compute NFL week from a kickoff anchor. Tweak env if needed. */
export function currentNflWeek(today = new Date()): number {
  const anchor = process.env.NFL_SEASON_KICKOFF || "2025-09-04T00:00:00Z"; // Thu of Wk1
  const start = new Date(anchor).getTime();
  const now = today.getTime();
  if (Number.isNaN(start) || now < start) return 1;

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = Math.floor((now - start) / msPerWeek);
  // Weeks 1..18
  return Math.min(18, Math.max(1, diff + 1));
}
