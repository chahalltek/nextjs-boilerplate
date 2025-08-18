import Link from "next/link";
import Countdown from "@/components/Countdown";
import { getSeason } from "@/lib/survivor/store";

export const dynamic = "force-dynamic";

export default async function SurvivorLanding() {
  const seasonId = "S47"; // change if you use route param later
  const season = await getSeason(seasonId);
  const locked = season ? new Date() >= new Date(season.lockAt) : false;

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">
          Predict the full boot order and Final 3. Scores update weekly after each episode.
        </p>
      </header>

      {/* Lock status + actions (only if a season exists) */}
      {season ? (
        <>
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
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          The current season isn’t configured yet. An admin can seed it in <code>/admin/survivor</code>.
        </div>
      )}

      {/* Rules & How it works — always visible */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="list-decimal pl-5 space-y-2 text-white/80 text-sm">
          <li>Drag contestants into your predicted boot order from first out to last out.</li>
          <li>Pick your Final 3 (and their exact order: Winner → Second → Third).</li>
          <li>Submit before the lock time. After lock, entries are read-only.</li>
          <li>We score your bracket after each episode and update the leaderboard.</li>
        </ol>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Scoring</h2>
        <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm">
          <li><span className="font-semibold">Weekly boots:</span> exact position +5; off by 1 = +2; off by 2–3 = +1.</li>
          <li><span className="font-semibold">Finale bonuses:</span> Winner +10; Final 3 in exact order +6.</li>
          <li><span className="font-semibold">Tiebreaker (optional):</span> predict the winner’s jury vote count.</li>
        </ul>

        {/* Compact at-a-glance */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">+5</div>
            <div className="text-white/70">Exact boot</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">+2</div>
            <div className="text-white/70">Off by 1</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">+1</div>
            <div className="text-white/70">Off by 2–3</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center col-span-2">
            <div className="text-2xl font-semibold">+10</div>
            <div className="text-white/70">Pick the Winner</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
            <div className="text-2xl font-semibold">+6</div>
            <div className="text-white/70">Final 3 exact</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">FAQ</h2>
        <div className="space-y-2 text-sm text-white/80">
          <p><span className="font-semibold">Can I edit after submitting?</span> Yes, until the lock time. After that, entries are frozen.</p>
          <p><span className="font-semibold">What if a player quits/returns?</span> We follow the aired boot order. If production shuffles things unusually, we’ll post clarifications on the page.</p>
          <p><span className="font-semibold">How many entries can I make?</span> One per person (be cool!). If you need a fix, ping us via the contact form.</p>
        </div>
      </section>

      {/* Secondary actions at bottom */}
      <div className="flex flex-wrap gap-3">
        {!season ? (
          <Link href="/subscribe" className="btn-gold">Notify me when the bracket opens</Link>
        ) : !locked ? (
          <Link href="/survivor/bracket" className="btn-gold">Enter Bracket</Link>
        ) : (
          <Link href="/survivor/leaderboard" className="cta-card">
            <span className="cta-title">View Leaderboard →</span>
            <span className="cta-sub">See who’s leading the season.</span>
          </Link>
        )}
      </div>
    </main>
  );
}
