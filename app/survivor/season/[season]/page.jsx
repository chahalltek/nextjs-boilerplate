// app/survivor/season/[season]/page.jsx
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function loadSeasonPolls(season) {
  const pollsDir = path.join(process.cwd(), "data", "polls");
  const resultsDir = path.join(process.cwd(), "data", "poll-results");
  const files = fs.existsSync(pollsDir) ? fs.readdirSync(pollsDir) : [];
  const polls = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = fs.readFileSync(path.join(pollsDir, file), "utf8");
      const poll = JSON.parse(raw);
      if (String(poll.season) !== String(season)) continue;
      const resPath = path.join(resultsDir, `${poll.slug}.json`);
      let results = null;
      if (fs.existsSync(resPath)) {
        try {
          results = JSON.parse(fs.readFileSync(resPath, "utf8"));
        } catch {}
      }
      polls.push({ ...poll, results });
    } catch {}
  }
  return polls;
}

export default function SeasonPage({ params }) {
  const season = params.season;
  const polls = loadSeasonPolls(season);

  const totals = {};
  polls.forEach((p) => {
    const counts = p.results?.counts || [];
    const options = p.options || [];
    options.forEach((opt, idx) => {
      const label = typeof opt === "string" ? opt : opt.label;
      const votes = counts[idx] || 0;
      totals[label] = (totals[label] || 0) + votes;
    });
  });
  const standings = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const consensusMVP = standings[0]?.[0] || null;
  const consensusLVP = standings[standings.length - 1]?.[0] || null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
      <header>
        <h1 className="text-4xl font-bold">Survivor Season {season}</h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Weekly polls</h2>
        {polls.length === 0 && (
          <p className="text-white/60">No polls yet.</p>
        )}
        <ul className="space-y-2">
          {polls.map((p) => {
            const counts = p.results?.counts || [];
            const options = p.options || [];
            let winner = null;
            if (counts.length) {
              const max = Math.max(...counts);
              const idx = counts.indexOf(max);
              const w = options[idx];
              winner = typeof w === "string" ? w : w?.label;
            }
            return (
              <li key={p.slug} className="card p-4">
                <div className="font-medium">{p.question}</div>
                {winner && (
                  <div className="text-sm text-white/60 mt-1">
                    Community pick: {winner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {standings.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Standings</h2>
          <ul className="space-y-1">
            {standings.map(([label, votes]) => (
              <li key={label} className="flex justify-between">
                <span>{label}</span>
                <span className="text-white/60">{votes} votes</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 text-white/80">
            {consensusMVP && (
              <p>
                <strong>Consensus MVP:</strong> {consensusMVP}
              </p>
            )}
            {consensusLVP && (
              <p>
                <strong>Consensus LVP:</strong> {consensusLVP}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}