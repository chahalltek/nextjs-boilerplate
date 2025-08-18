// app/survivor/leaderboard/page.tsx
import { getSeason, topLeaderboard } from "@/lib/survivor/store";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const seasonId = "S47"; // adjust if needed
  const season = await getSeason(seasonId);
  const rows = await topLeaderboard(seasonId, 200);

  if (!season) {
    return (
      <main className="container max-w-3xl py-10 space-y-4">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-white/70">Season not configured yet.</p>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Leaderboard — {season.name}</h1>
        <p className="text-white/70">Scores update after each episode.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-white/60">No entries yet. Be the first to submit!</p>
      ) : (
        <ol className="rounded-xl border border-white/10 divide-y divide-white/10">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between p-3">
              <span className="opacity-70 w-8">{i + 1}</span>
              <span className="flex-1">{r.name}</span>
              <span className="font-semibold">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
