// app/survivor/page.jsx
import nextDynamic from "next/dynamic";

export const runtime = "nodejs";
export const metadata = {
  title: "Survivor — Hey Skol Sister",
  description:
    "Vote in our weekly Survivor-style poll, watch live results, and join the conversation.",
};

// If survivor-client.jsx is in the SAME folder as this file:
const SurvivorClient = nextDynamic(() => import("./survivor-client"), {
  ssr: false,
});
const PlayerStats = nextDynamic(
  () => import("./survivor-client").then((m) => m.PlayerStats),
  { ssr: false }
);
const SurvivorTimeline = nextDynamic(
  () => import("./survivor-client").then((m) => m.SurvivorTimeline),
  { ssr: false }
);
const CastGrid = nextDynamic(
  () => import("./survivor-client").then((m) => m.CastGrid),
  { ssr: false }
);
const SurvivorTicker = nextDynamic(
  () => import("./survivor-client").then((m) => m.SurvivorTicker),
  { ssr: false }
);

export default function SurvivorPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 space-y-10">
      <header>
        <h1 className="text-4xl font-bold">Survivor</h1>
        <p className="mt-2 text-white/70">
          Vote in the weekly poll and see live results.
        </p>
      </header>
        <SurvivorTicker />
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cast</h2>
        <CastGrid />
      </section>

      <SurvivorClient />

      <section className="card p-4 md:p-6">
        <h2 className="text-2xl font-semibold mb-4">Player stats</h2>
        <PlayerStats />
      </section>

        <div className="card p-4 md:p-6">
        <SurvivorTimeline />
        </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="card p-6 space-y-3 lg:col-span-1">
          <h2 className="text-xl font-semibold">Survivor, meet Fantasy</h2>
          <p className="text-white/80">
            Survivor is basically fantasy football’s chaotic cousin: draftable
            humans, unpredictable weather, questionable alliances, and one
            confessional where everyone swears they’re “not here to make
            friends.” If you like managing rosters, reading vibes, and shouting
            at the TV, you’ll feel right at home.
          </p>
          <ul className="list-disc list-inside text-white/70 space-y-1">
            <li><span className="text-white">Strategy</span> over luck (mostly 🙃)</li>
            <li>Hidden advantages = waiver wire with palm fronds</li>
            <li>Tribal Council = the ultimate start/sit decision</li>
          </ul>
        </article>

        <article className="card p-6 space-y-3 lg:col-span-1">
          <h2 className="text-xl font-semibold">How our polls work</h2>
          <ol className="list-decimal list-inside text-white/80 space-y-1">
            <li>Pick a poll on the left.</li>
            <li>Make your choice — no account required.</li>
            <li>See live results update instantly.</li>
          </ol>
          <p className="text-white/70">
            We’ll post new polls through the season. Ties are possible; that’s
            showbiz. Be nice in the comments — we mod like Jeff hosts:
            relentlessly, but with a smile.
          </p>
        </article>

        <article className="card p-6 space-y-3 lg:col-span-1">
          <h2 className="text-xl font-semibold">Season snapshot</h2>
          <p className="text-white/80">
            Each season tweaks the rules a bit — new idols, advantages, and
            twists that make your fantasy brain tingle. We’ll highlight notable
            changes in each week’s poll so you’re never blindsided.
          </p>
          <p className="text-white/60 text-sm">
            Premiere date: we’ll update here once CBS posts the official slate.
            Either way, the torch is lit — let’s play.
          </p>
        </article>
      </section>
    </div>
  );
}
