// app/survivor/leaderboard/page.tsx
import { getSeason, getEntries, scoreAll } from "@/lib/survivor/data"; // implement using your store

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const season = await getSeason("S47");
  const entries = await getEntries("S47");
  const scored = scoreAll(season, entries).sort((a,b)=>b.score-a.score);
  return (
    <main className="container max-w-3xl py-10 space-y-4">
      <h1 className="text-3xl font-bold">Leaderboard — {season.name}</h1>
      <ol className="rounded-xl border border-white/10 divide-y divide-white/10">
        {scored.map((e, i) => (
          <li key={e.id} className="flex items-center justify-between p-3">
            <span className="opacity-70 w-8">{i+1}</span>
            <span className="flex-1">{e.name}</span>
            <span className="font-semibold">{e.score}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
