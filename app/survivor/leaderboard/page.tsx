// app/survivor/leaderboard/page.tsx
import { topLeaderboard, getSeason } from "@/lib/survivor/store";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const seasonId = "S47"; // or read from searchParams/route
  const season = await getSeason(seasonId);
  const rows = await topLeaderboard(seasonId, 200);

  return (
    <main className="container max-w-3xl py-10 space-y-4">
      <h1 className="text-3xl font-bold">Leaderboard — {season?.name || seasonId}</h1>
      <ol className="rounded-xl border border-white/10 divide-y divide-white/10">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center justify-between p-3">
            <span className="opacity-70 w-8">{i + 1}</span>
            <span className="flex-1">{r.name}</span>
            <span className="font-semibold">{r.score}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
