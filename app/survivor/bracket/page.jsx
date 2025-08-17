// app/survivor/bracket/page.jsx
export const runtime = "edge";

export default function BracketPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-4xl font-bold">Survivor Bracket</h1>
      <p className="text-white/70">
        Preseason bracket predictions will live here. Pick your order of
        finish and see how many points you earn as the season unfolds.
      </p>
      <p className="text-white/50">
        {/* TODO: Implement interactive bracket mini-game */}
      </p>
    </div>
  );
}