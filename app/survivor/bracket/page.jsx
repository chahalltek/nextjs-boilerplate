import BracketBuilder from "@/components/survivor/BracketBuilder";
import { getSeason } from "@/lib/survivor/store"; // ✅ fix

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const seasonId = "S47"; // or paramize later
  const season = await getSeason(seasonId);

  if (!season) {
    return (
      <main className="container max-w-4xl py-10 space-y-4">
        <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
        <p className="text-white/70">Season not configured yet.</p>
      </main>
    );
  }

  const locked = new Date() >= new Date(season.lockAt);

  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">Survivor Bracket Challenge</h1>
      <p className="text-white/70">Drag contestants into your predicted boot order, then pick your Final 3.</p>
      <BracketBuilder season={season} locked={locked} />
    </main>
  );
}
