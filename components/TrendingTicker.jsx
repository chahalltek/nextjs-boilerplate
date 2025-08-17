import { getTrendingPlayers } from "@/lib/sleeper.js";

export default async function TrendingTicker() {
  const players = await getTrendingPlayers();
  const items = [...players, ...players];

  return (
    <div className="ticker" aria-label="Trending fantasy players">
      <ul className="ticker-track" tabIndex={0}>
        {items.map((p, i) => (
          <li key={`${p.player_id}-${i}`} className="flex-shrink-0 mr-8">
            <span className="font-semibold">{p.full_name}</span>{" "}
            {p.team ? (
              <span className="text-white/60 text-sm">
                ({p.team} {p.position})
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}