// lib/players/search.ts
// Lightweight Sleeper player search with in-memory caching.

export type PlayerIndex = {
  id: string;          // Sleeper player_id
  name: string;        // full_name
  team?: string;
  position?: string;   // e.g. QB, RB, WR, TE, K, DEF
};

let CACHE: PlayerIndex[] = [];
let LAST_FETCH = 0;
const TTL_MS = 1000 * 60 * 60; // 1 hour

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadIndex(): Promise<PlayerIndex[]> {
  const now = Date.now();
  if (CACHE.length && now - LAST_FETCH < TTL_MS) return CACHE;

  const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
    // Next can cache this if you want, but runtime=node is fine:
    next: { revalidate: 3600 },
  });
  const data = (await res.json()) as Record<string, any>;

  // Sleeper returns a map keyed by player_id
  const list: PlayerIndex[] = Object.keys(data).map((player_id) => {
    const p = data[player_id] || {};
    return {
      id: player_id,
      name: p.full_name || p.first_name && p.last_name
        ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
        : player_id,
      team: p.team || p.fantasy_positions?.[0] || p.team_abbr,
      position: p.position || p.fantasy_positions?.[0] || (p.team && "DEF") || undefined,
    };
  });

  // Basic hygiene: drop obviously empty names
  CACHE = list.filter((p) => p.name && p.name !== p.id);
  LAST_FETCH = now;
  return CACHE;
}

export async function searchPlayers(
  query: string,
  limit = 15
): Promise<PlayerIndex[]> {
  const q = norm(query);
  if (!q) return [];

  const idx = await loadIndex();

  // Token-based scoring
  const tokens = q.split(" ");
  const scored = idx
    .map((p) => {
      const n = norm(p.name);
      const hay = [n, p.team?.toLowerCase() ?? "", p.position?.toLowerCase() ?? ""].join(" ");
      let score = 0;

      // starts-with boost
      if (n.startsWith(q)) score += 5;
      // token matches
      for (const t of tokens) {
        if (t && hay.includes(t)) score += 2;
      }
      // exact name match bonus
      if (n === q) score += 10;

      return { p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);

  return scored;
}
