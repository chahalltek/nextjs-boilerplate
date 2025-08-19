// lib/players/search.ts
export type PlayerHit = {
  id: string;
  name: string;
  team?: string;
  position?: string;
  label: string; // "Name — TEAM POS"
};

const ALLOWED = new Set(["QB", "RB", "WR", "TE", "K", "DEF", "DST"]);

let _players: Record<string, any> | null = null;

async function loadPlayers(): Promise<Record<string, any>> {
  if (_players) return _players;
  const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
    // this endpoint updates rarely; you can tune caching later
    cache: "no-store",
  });
  _players = await res.json();
  return _players!;
}

function bestName(p: any): string {
  return (
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.search_full_name ||
    ""
  );
}

export async function searchPlayers(query: string, limit = 12): Promise<PlayerHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const dict = await loadPlayers();
  const hits: PlayerHit[] = [];

  for (const id in dict) {
    const p = dict[id];
    const pos: string | undefined =
      p.position || (Array.isArray(p.fantasy_positions) ? p.fantasy_positions[0] : undefined);

    // keep the search focused to fantasy-relevant positions
    if (!pos || !ALLOWED.has(pos)) continue;

    const name = bestName(p);
    if (!name) continue;

    const team: string | undefined = p.team || undefined;

    // quick match (you can expand to fuzzy later)
    const hay = `${name} ${team ?? ""} ${pos} ${id}`.toLowerCase();
    if (!hay.includes(q)) continue;

    const label = `${name}${team ? ` — ${team}` : ""}${pos ? ` ${pos}` : ""}`.trim();

    hits.push({ id, name, team, position: pos, label });
    if (hits.length >= limit) break;
  }

  // quality sort: startsWith first, then shorter label
  hits.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;
    return a.label.length - b.label.length;
  });

  return hits;
}
