// app/api/sleeper/health/route.ts
export const runtime = "nodejs";

export async function GET() {
  const year = new Date().getFullYear();
  const week = 1;

  const [playersRes, projRes, statsRes] = await Promise.all([
    fetch("https://api.sleeper.app/v1/players/nfl", { cache: "no-store" }),
    fetch(`https://api.sleeper.app/projections/nfl/${year}/${week}?season_type=pre`, { cache: "no-store" }),
    fetch(`https://api.sleeper.app/stats/nfl/pre/${year}/${week}`, { cache: "no-store" }),
  ]);

  const players = await playersRes.json().catch(() => ({}));
  const proj = await projRes.json().catch(() => []);
  const stats = await statsRes.json().catch(() => ({}));

  return new Response(
    JSON.stringify({
      ok: playersRes.ok && projRes.ok && statsRes.ok,
      playersCount: Object.keys(players || {}).length,
      projectionsCount: Array.isArray(proj) ? proj.length : 0,
      statsKeys: typeof stats === "object" ? Object.keys(stats || {}).length : 0,
    }),
    { headers: { "content-type": "application/json" } }
  );
}
