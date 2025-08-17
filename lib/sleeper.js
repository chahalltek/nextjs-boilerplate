const BASE_URL = 'https://api.sleeper.app/v1';

async function fetchJson(url, revalidate = 0) {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`Sleeper API request failed: ${res.status}`);
  return res.json();
}

export async function getPlayers() {
  return fetchJson(`${BASE_URL}/players/nfl`, 3600);
}

export async function getTrendingPlayers(limit = 10) {
  const trending = await fetchJson(
    `${BASE_URL}/players/nfl/trending/add?lookback_hours=24&limit=${limit}`,
    300
  );
  const players = await getPlayers();
  return trending.map((t) => ({
    player_id: t.player_id,
    count: t.count,
    ...players[t.player_id],
  }));
}

export async function getInjuredPlayers(limit = 20) {
  const players = await getPlayers();
  const injured = Object.values(players).filter(
    (p) => p.injury_status && p.injury_status !== 'N/A'
  );
  return injured.slice(0, limit);
}
