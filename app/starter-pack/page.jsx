// app/starter-pack/page.jsx
export const runtime = "nodejs";

export default function StarterPackPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-6 print:py-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skol Starter Pack — One-Page</h1>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 print:hidden"
        >
          Download PDF
        </button>
      </div>

      <div className="card p-5 space-y-4 print:bg-white print:text-black print:rounded-none print:border-0">
        <Section title="The Sunday Routine (10 minutes)">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Check inactives 90 minutes before kickoff.</li>
            <li>Start/Sit: use our tiers (A/B/C/D) + confidence %.</li>
            <li>FLEX tiebreaker: higher target share wins.</li>
            <li>Late swap: keep players with later games in FLEX.</li>
          </ol>
        </Section>

        <Section title="Quick Glossary">
          <ul className="list-disc ml-5 space-y-1">
            <li><b>PPR:</b> 1 point per reception.</li>
            <li><b>Ceiling:</b> best-case outcome. <b>Floor:</b> worst-case.</li>
            <li><b>FLEX:</b> WR/RB/TE slot you can mix & match.</li>
            <li><b>Stream:</b> short-term starter by matchup.</li>
          </ul>
        </Section>

        <Section title="Trade / Waiver Tips">
          <ul className="list-disc ml-5 space-y-1">
            <li>Buy players with stable snaps + targets after a quiet week.</li>
            <li>Sell TD-only producers with shaky volume.</li>
            <li>stash upside RBs behind injury-prone starters.</li>
          </ul>
        </Section>

        <Section title="Start/Sit Tiers (how to use)">
          <p>
            Start A confidently. B are strong starts. C are matchup/need based.
            D are “only if desperate.” Use our confidence % to break ties.
          </p>
        </Section>

        <div className="text-xs text-white/50 print:text-black/70">
          Get weekly cheat sheets: heyskolsister.com — © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <div className="text-sm text-white/80">{children}</div>
    </section>
  );
}
