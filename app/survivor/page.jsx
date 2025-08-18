// app/survivor/page.jsx
import Link from "next/link";
import Countdown from "@/components/Countdown";
import { getSeason } from "@/lib/survivor/store";

export const dynamic = "force-dynamic";

export default async function SurvivorLanding() {
  const seasonId = "S47"; // change if you use route param later
  const season = await getSeason(seasonId);

  if (!season) {
    return (
      <main className="container max-w-3xl py-10 space-y-6">
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">
          The current season isn’t configured yet. Ask an admin to seed the season in Super Admin.
        </p>
      </main>
    );
  }

  const locked = new Date() >= new Date(season.lockAt);

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">
          Predict the full boot order and Final 3. Scores update weekly after each episode.
        </p>
      </header>

      {/* Lock status + countdown */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
        <div className="text-sm text-white/80">
          Bracket lock: <span className="font-semibold">{new Date(season.lockAt).toLocaleString()}</span>
        </div>
        {!locked ? (
          <div className="text-sm text-white/70">
            <Countdown to={season.lockAt} />
          </div>
        ) : (
          <div className="text-sm text-white/70">Locked</div>
        )}
      </div>

      {/* Primary actions */}
      <div className="flex flex-wrap gap-3">
        {!locked ? (
          <Link href="/survivor/bracket" className="btn-gold inline-flex items-center justify-center">
            Enter Bracket
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold bg-white/10 text-white/60 cursor-not-allowed"
            title="Bracket is locked"
          >
            Bracket Locked
          </button>
        )}

        <Link href="/survivor/leaderboard" className="cta-card">
          <span className="cta-title">View Leaderboard →</span>
          <span className="cta-sub">See who’s leading the season.</span>
        </Link>
      </div>

      {/* Quick rules */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Rules (quick)</h2>
        <ul className="list-disc pl-5 text-white/80 space-y-1 text-sm">
          <li>Exact boot correct: +5; off by 1: +2; off by 2–3: +1.</li>
          <li>Finale bonuses: Winner +10; Final 3 in exact order +6.</li>
          <li>Tiebreaker optional: winner’s jury vote count.</li>
        </ul>
      </section>
    </main>
  );
}
