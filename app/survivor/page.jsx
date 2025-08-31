// app/survivor/page.jsx
import Link from "next/link";
import Image from "next/image";
import Countdown from "@/components/Countdown";
import { getSeason } from "@/lib/survivor/store";

export const dynamic = "force-dynamic";

export default async function SurvivorLanding({ searchParams }) {
  // Choose season: URL ?season=..., or env, or default to S49
  const envSeason =
    process.env.NEXT_PUBLIC_SURVIVOR_SEASON_ID ||
    process.env.SURVIVOR_SEASON_ID ||
    "S49";

// Small inline CTA component
function SurvivorReminder() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <div className="font-semibold">Survivor weekly recap</div>
        <p className="text-sm text-white/70">
          Get an email after every episode with <span className="font-medium">your score</span> for the week
          and a direct link to the <span className="font-medium">leaderboard</span>.
        </p>
      </div>
      <Link
        href="/subscribe?topic=survivor-weekly&src=survivor-landing"
        className="btn-gold whitespace-nowrap"
      >
        Get the recap
      </Link>
    </div>
  );
}

  const seasonId =
    (typeof searchParams?.season === "string" ? searchParams.season : envSeason) ||
    "S49";

  const season = await getSeason(String(seasonId).toUpperCase());
  const locked = season ? new Date() >= new Date(season.lockAt) : false;
  const openForEntries = !!season && !locked;

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">
          Predict the full boot order and Final 3. Scores update weekly after each episode.
        </p>
      </header>

     {/* S49 cast hero */}
<figure className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
  {/* Taller aspect on small → gradually flattens on wide screens */}
  <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/9]">
    <Image
      src="/survivor/s49-cast.webp"
      alt="Survivor 49 cast on the beach"
      fill
      sizes="(max-width: 1024px) 100vw, 768px"
      className="object-cover"
      // bias the crop upward so the back row isn't cut off
      style={{ objectPosition: "50% 18%" }} 
      priority
    />
  </div>
  <figcaption className="p-2 text-[11px] text-white/60 text-right">
    Survivor 49 cast • Photo: CBS
  </figcaption>
</figure>

      <section className="container my-8">
  <SurvivorReminder />
</section>

      {/* Lock status + actions */}
      {season ? (
        <>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-white/80">
              Season: <span className="font-semibold">{season.id}</span> • Lock:{" "}
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
            {openForEntries ? (
              <Link href="/survivor/bracket" className="btn-gold inline-flex items-center justify-center">
                Play the Game
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
          Season 49 premieres on September 24 at 8PM ET!
        </div>
      )}

      {/* How it works */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="list-decimal pl-5 space-y-2 text-white/80 text-sm">
          <li>You have four weeks to get to know the players. The bracket locks 10/24.</li>
          <li>Submit before the lock time. After lock, entries are read-only.</li>
          <li>Drag contestants into your predicted boot order from first out to last out.</li>
          <li>Pick your Final 3 (and their exact order: Winner → Second → Third).</li>
          <li>We score your bracket after each episode and update the leaderboard.</li>
        </ol>
      </section>

      {/* Scoring */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Scoring</h2>
        <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm">
          <li><span className="font-semibold">Weekly boots:</span> exact position +5; off by 1 = +2; off by 2–3 = +1.</li>
          <li><span className="font-semibold">Finale bonuses:</span> Winner +10; Final 3 in exact order +6.</li>
          <li><span className="font-semibold">Tiebreaker (optional):</span> predict the winner’s jury vote count.</li>
        </ul>

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

      {/* FAQ */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">FAQ</h2>
        <div className="space-y-2 text-sm text-white/80">
          <p><span className="font-semibold">Can I edit after submitting?</span> Yes, until the lock time. After that, entries are frozen.</p>
          <p><span className="font-semibold">What if a player quits/returns?</span> We follow the aired boot order. If production shuffles things unusually, we’ll post clarifications on the page.</p>
          <p><span className="font-semibold">How many entries can I make?</span> One per person (be cool!). If you need a fix, ping us via the contact form.</p>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="flex flex-wrap gap-3">
        {!season ? (
          <Link href="/subscribe" className="btn-gold">Notify me when the bracket opens</Link>
        ) : openForEntries ? (
          <Link href="/survivor/bracket" className="btn-gold">Play the Game</Link>
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
