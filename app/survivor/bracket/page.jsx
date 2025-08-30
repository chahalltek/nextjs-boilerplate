// app/survivor/bracket/page.jsx
import Link from "next/link";
import BracketBuilder from "@/components/survivor/BracketBuilder";
import { getSeason } from "@/lib/survivor/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BracketPage({ searchParams }) {
  // Read season from query (?season=S49); fall back to S49 (change if needed)
  const seasonId =
    typeof searchParams?.season === "string"
      ? searchParams.season.toUpperCase()
      : "S49";

  const season = await getSeason(seasonId);

  if (!season) {
    return (
      <main className="container max-w-4xl py-10 space-y-6">
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">
          We couldn’t find season <span className="font-mono">{seasonId}</span>.
        </p>
        <Link href="/survivor" className="btn-gold w-fit">
          Back to Survivor home
        </Link>
      </main>
    );
  }

  const locked = Date.now() >= new Date(season.lockAt).valueOf();

  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">
          Drag contestants into your predicted boot order, then pick your Final 3.
        </p>
      </header>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
        <div className="text-sm text-white/80">
          Season: <span className="font-mono">{season.id}</span>{" "}
          • Lock:{" "}
          <span className="font-semibold">
            {new Date(season.lockAt).toLocaleString()}
          </span>
        </div>
        {locked ? (
          <div className="text-xs rounded px-2 py-1 bg-red-500/20 border border-red-400/30 text-red-200">
            Bracket is locked
          </div>
        ) : (
          <div className="text-xs rounded px-2 py-1 bg-green-500/20 border border-green-400/30 text-green-200">
            Open for entries
          </div>
        )}
      </div>

      {/* Your interactive builder */}
      <BracketBuilder season={season} locked={locked} />

      <div className="flex gap-3">
        <Link href="/survivor" className="cta-card">
          <span className="cta-title">Survivor Home →</span>
          <span className="cta-sub">Rules, scoring, and updates.</span>
        </Link>
        <Link href="/survivor/leaderboard" className="cta-card">
          <span className="cta-title">Leaderboard →</span>
          <span className="cta-sub">See who’s leading the season.</span>
        </Link>
      </div>
    </main>
  );
}
