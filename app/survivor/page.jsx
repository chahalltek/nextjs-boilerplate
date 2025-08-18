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
    <main className="container max-w-3xl py-10 space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">
          Predict the full boot order and Final 3. Scores update weekly after each episode.
        </p>
      </header>

      {/* Lock status + countdown */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
        <div className="text-sm text-white/80">
          Bracket lock:{" "}
          <span className="font-semibold">
            {new Date(season.lockAt).toLocaleString()}
          </span>
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

      {/* How to play */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">How to play</h2>
        <ol className="list-decimal pl-5 text-white/80 space-y-1 text-sm">
          <li>
            Open the{" "}
            <Link href="/survivor/bracket" className="underline">
              Bracket Builder
            </Link>
            .
          </li>
          <li>
            Drag contestants into your predicted <span className="font-medium text-white">boot order</span>{" "}
            from first out to winner.
          </li>
          <li>
            Set your <span className="font-medium text-white">Final 3</span>{" "}
            (left → right = Winner, Second, Third).
          </li>
          <li>Enter your display name and submit. You can edit until the lock time above.</li>
          <li>
            Come back weekly to check the{" "}
            <Link href="/survivor/leaderboard" className="underline">
              leaderboard
            </Link>
            .
          </li>
        </ol>
      </section>

      {/* Scoring */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Scoring</h2>

        <p className="text-sm text-white/80">
          For each contestant, you earn points based on how close your predicted boot position is to the actual:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">+5</div>
            <div className="text-white/70">Exact position</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">+2</div>
            <div className="text-white/70">Off by 1</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">+1</div>
            <div className="text-white/70">Off by 2–3</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">0</div>
            <div className="text-white/70">Off by 4+</div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
          <div className="font-medium mb-1">Finale bonuses</div>
          <ul className="list-disc pl-5 space-y-1 text-white/80">
            <li>
              Correct winner: <span className="font-semibold text-white">+10</span>
            </li>
            <li>
              Final 3 in exact order (Winner → Second → Third):{" "}
              <span className="font-semibold text-white">+6</span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-white/60">
          Notes: Double boots and medevacs count as separate positions in the order they occur. If a twist
          changes the number of finalists, we’ll adapt the scoring as closely as possible to the rules above.
        </p>
      </section>

      {/* Tiebreaker & edits */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Tiebreakers & edits</h2>
        <ul className="list-disc pl-5 text-white/80 space-y-1 text-sm">
          <li>
            <span className="font-medium text-white">Tiebreaker:</span> predict the winner’s jury vote
            count. Closest wins; if still tied, earliest submitted entry wins.
          </li>
          <li>
            <span className="font-medium text-white">Edits:</span> you may update your bracket until the
            lock time. After lock, no changes.
          </li>
          <li>
            <span className="font-medium text-white">Fair play:</span> one entry per person; obvious
            duplicates may be removed.
          </li>
        </ul>
      </section>

      {/* Quick rules (recap) */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold mb-2">Rules (quick)</h2>
        <ul className="list-disc pl-5 text-white/80 space-y-1 text-sm">
          <li>Exact boot correct: +5; off by 1: +2; off by 2–3: +1.</li>
          <li>Finale bonuses: Winner +10; Final 3 in exact order +6.</li>
          <li>Tiebreaker: winner’s jury vote count (closest wins).</li>
        </ul>
      </section>
    </main>
  );
}
