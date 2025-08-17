import { getTrendingPlayers } from "@/lib/sleeper.js";

export default async function TrendingPlayers() {
   const players = await getTrendingPlayers();

  return (
    <section className="container mt-16">
      <h2 className="text-xl font-semibold mb-4">Trending Additions</h2>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.player_id}
            className="flex justify-between border-b border-white/10 pb-2"
          >
            <span>
              {p.full_name} {p.team ? `(${p.team} ${p.position})` : ""}
            </span>
            <span className="text-white/60 text-sm">Adds: {p.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}