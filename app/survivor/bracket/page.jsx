// app/survivor/bracket/page.jsx
import BracketBuilder from "@/components/survivor/BracketBuilder";
import { getSeason } from "@/lib/survivor/store"; // ✅ correct import

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const season = await getSeason("S47");
  if (!season) return null;
  const locked = new Date() >= new Date(season.lockAt);
  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
      <p className="text-white/70">Drag contestants into your predicted boot order, then pick your Final 3.</p>
      <BracketBuilder season={season} locked={locked} />
    </main>
  );
}
