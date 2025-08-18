import { getInjuredPlayers } from "@/lib/sleeper.js";

export default async function InjuryTicker() {
  const injuries = await getInjuredPlayers();
  const items = [...injuries, ...injuries];

  return (
    <div className="ticker" aria-label="NFL injury report">
      <ul className="ticker-track" tabIndex={0}>
        {items.map((p, i) => (
          <li
            key={`${p.player_id}-${i}`}
            className="flex-shrink-0"
            aria-hidden={i >= injuries.length}
          >
            <span className="font-semibold">{p.full_name}</span>{" "}
            {p.team ? (
              <span className="text-white/60 text-sm">
                ({p.team} {p.position})
              </span>
            ) : null}
            {": "}
            <span className="text-white/60 text-sm">
              {p.injury_status}
              {p.injury_note ? ` – ${p.injury_note}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}