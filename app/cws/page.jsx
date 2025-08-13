export const metadata = {
  title: "CWS — Coulda, Woulda, Shoulda · The Skol Sisters",
  description:
    "Vent zone for last week’s fantasy decisions. Laugh, cry, heal, repeat.",
};

export default function CWSPage() {
  return (
    <section className="container py-12 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold">
        CWS <span className="text-white/60 text-xl">— Coulda, Woulda, Shoulda</span>
      </h1>
      <p className="mt-3 text-white/80">
        Welcome to the weekly confessional. This is the safe place to admit you
        benched a 30-burger for a “gut feel,” forgot a 9:30am London kickoff, or
        traded away the guy who immediately turned into Jerry Rice.
      </p>

      <div className="mt-8 grid gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold">How it works</h2>
          <ol className="list-decimal ml-5 mt-2 space-y-1 text-white/80">
            <li>Share your CWS moment from last week (be dramatic, we support it).</li>
            <li>Tell us what you <em>woulda</em> done differently.</li>
            <li>Get a little empathy and a little roast. Both are healing. 💜</li>
          </ol>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold">Prompts to get you going</h3>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-white/80">
            <li>“Started the ‘safe’ RB. Watched my bench RB score twice. Send thoughts & prayers.”</li>
            <li>“Dropped a sleeper on Saturday. He became Sunday’s headline.”</li>
            <li>“Traded upside for ‘floor’. Floor collapsed.”</li>
          </ul>
        </div>

        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-5">
          <p className="text-sm">
            Pro tip: Turn CWS into FYW—<strong>Fix Your Week</strong>. Note one takeaway
            you’ll actually apply before waivers lock.
          </p>
        </div>
      </div>
    </section>
  );
}
