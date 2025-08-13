export const metadata = {
  title: "Survivor — Superfan Corner · The Skol Sisters",
  description:
    "Strategy talk, power rankings, and spicy takes from a lifelong Survivor superfan.",
};

export default function SurvivorPage() {
  return (
    <section className="container py-12 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold">Survivor</h1>
      <p className="mt-3 text-white/80">
        Tribal Council meets fantasy brain. Same game theory, fewer hamstrings.
        If you’ve seen every season (same 🙋‍♀️), this is our campfire.
      </p>

      <div className="mt-8 grid gap-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold">This Week’s Torch Talk</h2>
          <p className="mt-2 text-white/80">
            Idols, alliances, and edit reads—what we learned and who actually
            moved the needle. Was it gameplay or a purple edit? Let’s decode.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold">Power Rankings (vibes allowed)</h3>
          <ul className="list-decimal ml-5 mt-2 space-y-1 text-white/80">
            <li><strong>Strategists:</strong> Making plans, not friends.</li>
            <li><strong>Social threats:</strong> Everyone’s bestie until Final 7.</li>
            <li><strong>Challenge beasts:</strong> Immunity necklaces look good on you.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold">Fantasy Crossover</h3>
          <p className="mt-2 text-white/80">
            Survivor lessons that translate to lineup edges: information
            asymmetry (&ldquo;waiver idols&rdquo;), alliance building (trade
            partners), and knowing when to flip (start the high-variance flex).
          </p>
        </div>
      </div>
    </section>
  );
}
