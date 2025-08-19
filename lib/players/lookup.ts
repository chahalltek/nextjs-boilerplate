// lib/players/lookup.ts
let cache: { at: number; data: Record<string, any> } | null = null;

async function loadPlayers(): Promise<Record<string, any>> {
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) return cache.data; // 1h
  const res = await fetch("https://api.sleeper.app/v1/players/nfl", { cache: "no-store" });
  const data = await res.json();
  cache = { at: Date.now(), data };
  return data;
}

export async function lookupByIds(ids: string[]) {
  const map = await loadPlayers();
  const out: Record<string, { id: string; name: string; team?: string; pos?: string }> = {};
  for (const id of ids) {
    const p = map[id];
    out[id] = {
      id,
      name: p?.full_name || id,
      team: p?.team || undefined,
      pos: p?.position || undefined,
    };
  }
  return out;
}
