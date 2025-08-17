import { getNflSchedule } from "@/lib/nfl.js";

export default async function NflScheduleTicker() {
  const games = await getNflSchedule();
  const items = [...games, ...games];

  return (
    <div className="ticker" aria-label="This week's NFL schedule">
      <ul className="ticker-track" tabIndex={0}>
        {items.map((g, i) => (
          <li
            key={`${g.id}-${i}`}
            className="flex-shrink-0"
            aria-hidden={i >= games.length}
          >
            <span className="font-semibold">{g.away} @ {g.home}</span>{" "}
            <span className="text-white/60 text-sm">{g.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}