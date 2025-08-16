export const metadata = {
  title: "Fantasy Football 101 — Hey Skol Sister",
  description:
    "A warm, beginner-friendly guide: history, how drafts work, scoring (incl. PPR), waivers, trades, and weekly strategy.",
  alternates: { canonical: "/101" },
};

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-white/15 bg-white/5">
      {children}
    </span>
  );
}

function Card({ title, children, icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-3 text-white/80 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// Simple, dependency-free SVGs for a friendly look
function TrophyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFC62F" />
          <stop offset="100%" stopColor="#E5A900" />
        </linearGradient>
      </defs>
      <path d="M14 10h36v8a14 14 0 0 1-28 0V10z" fill="url(#g1)" />
      <path d="M20 10H8a8 8 0 0 0 8 10M44 10h12a8 8 0 0 1-8 10" fill="none" stroke="#FFD95A" strokeWidth="3" />
      <path d="M22 28c2 6 8 10 14 10s12-4 14-10v6c0 6-10 12-14 14-4-2-14-8-14-14v-6z" fill="#FFC62F" />
      <rect x="26" y="48" width="12" height="4" fill="#E5A900" />
      <rect x="20" y="52" width="24" height="6" rx="2" fill="#FFC62F" />
    </svg>
  );
}

function WhistleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 34a14 14 0 1 1 28 0h8l8 6-8 6h-8a14 14 0 1 1-28-12z" fill="#4F2683" />
      <circle cx="24" cy="34" r="6" fill="#FFC62F" />
    </svg>
  );
}

function PlaybookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="10" width="44" height="44" rx="6" fill="#2A1B4E" stroke="#4F2683" strokeWidth="2" />
      <path d="M20 20l8 8m0 0l-8 8M44 20c-8 6-8 10-16 16" stroke="#FFC62F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FieldIllustration() {
  return (
    <svg viewBox="0 0 600 220" role="img" aria-label="Stylized football field"
      className="w-full rounded-2xl border border-white/10 shadow-lg">
      <defs>
        <linearGradient id="grass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0F4020" />
          <stop offset="100%" stopColor="#0C3319" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="600" height="220" fill="url(#grass)" />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="220" stroke="white" strokeOpacity="0.2" />
      ))}
      <rect x="0" y="0" width="20" height="220" fill="#4F2683" />
      <rect x="580" y="0" width="20" height="220" fill="#FFC62F" />
      <circle cx="300" cy="110" r="48" fill="none" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="2" />
      {/* ball */}
      <ellipse cx="300" cy="110" rx="22" ry="12" fill="#7A3E1A" stroke="#3F1F0D" strokeWidth="3" />
      <path d="M292 110h16" stroke="#fff" strokeWidth="2" />
      <path d="M296 106l8 8M296 114l8-8" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

export default function Page() {
  return (
    <div className="container py-10 max-w-5xl">
      {/* Hero */}
      <section className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Fantasy Football <span className="text-[color:var(--skol-gold)]">101</span>
          </h1>
          <p className="mt-4 text-white/80">
            You belong here. This guide explains the game without the jargon wall:
            what fantasy is, how drafts work, scoring (incl. PPR), and how to manage your team.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>Beginner-friendly</Badge>
            <Badge>No judgment</Badge>
            <Badge>Quick to read</Badge>
          </div>
        </div>
        <FieldIllustration />
      </section>

      {/* What it is */}
      <section className="mt-12 grid gap-4">
        <h2 className="text-2xl font-bold">What fantasy football is (in one line)</h2>
        <p className="text-white/80">
          You draft real NFL players to your imaginary team; when they do well in real games, you score points and face another team each week.
        </p>
      </section>

      {/* Origin + How leagues work */}
      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <Card title="Where it started" icon={<TrophyIcon />}>
          Born in the ’60s with pen-and-paper scoring, fantasy exploded online in the 2000s. Today there are many formats, but the core is the same:
          build a lineup, score points, win the week.
        </Card>
        <Card title="League basics" icon={<WhistleIcon />}>
          8–12 teams, weekly head-to-head matchups. Typical starters: 1 QB, 2–3 WR, 2 RB, 1 TE, 1 FLEX, maybe K and D/ST. Bench holds backups.
        </Card>
        <Card title="Draft day" icon={<PlaybookIcon />}>
          <strong>Snake:</strong> 1→12 then 12→1, repeat. <strong>Auction:</strong> bid from a budget.
          Draft gives you your base roster—you’ll tune it all season.
        </Card>
      </section>

      {/* Scoring */}
      <section className="mt-12 grid gap-4">
        <h2 className="text-2xl font-bold">How scoring works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">Core points</h3>
            <ul className="mt-3 list-disc list-inside text-white/80 space-y-2">
              <li>Rush/Receive: ~1 pt per 10 yards, 6 pts per TD</li>
              <li>Passing: ~1 pt per 25 yards, 4–6 pts per TD, −2 for INT</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">PPR variations</h3>
            <ul className="mt-3 list-disc list-inside text-white/80 space-y-2">
              <li><strong>Standard:</strong> 0 per catch</li>
              <li><strong>Half-PPR:</strong> 0.5 per catch</li>
              <li><strong>Full PPR:</strong> 1.0 per catch</li>
            </ul>
          </div>
        </div>
        <p className="text-white/70 text-sm">
          Your league’s settings page is the source of truth—peek there for exact values.
        </p>
      </section>

      {/* Simple plans */}
      <section className="mt-12 grid gap-6">
        <h2 className="text-2xl font-bold">A simple plan that works</h2>
        <ol className="text-white/80 space-y-3">
          <li><strong>Know your settings:</strong> PPR vs Standard, roster spots, # of teams.</li>
          <li><strong>Draft:</strong> Prioritize WR/RB early, wait a bit on QB (in 1-QB leagues), draft TE early only if elite.</li>
          <li><strong>Weekly flow:</strong> Set lineup before kickoffs, use waivers for emerging players, favor good matchups and full-time roles.</li>
          <li><strong>Trades:</strong> Combine two solid players for one upgrade; balance positions.</li>
          <li><strong>Playoffs prep:</strong> Peek at Weeks 15–17 and stash upside.</li>
        </ol>
      </section>

      {/* Quick glossary */}
      <section className="mt-12 grid gap-4">
        <h2 className="text-2xl font-bold">Quick glossary (no eye-rolls)</h2>
        <div className="grid md:grid-cols-2 gap-6 text-white/80">
          <ul className="list-disc list-inside space-y-2">
            <li><strong>PPR / Half / Standard:</strong> points per catch rules</li>
            <li><strong>Waivers / FAAB:</strong> weekly add process / your bidding budget</li>
            <li><strong>ADP:</strong> average draft position</li>
          </ul>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Handcuff:</strong> backup to your star RB</li>
            <li><strong>Floor/Ceiling:</strong> safe minimum vs upside</li>
            <li><strong>Stack:</strong> pair your QB with his WR/TE</li>
          </ul>
        </div>
      </section>

      {/* Closing */}
      <section className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/90">
            You’ve got this. If you want a tailored mini draft board or help with your first lineup,
            <a href="/contact" className="underline underline-offset-4"> ping us</a>—we’re happy to help. 💜
          </p>
        </div>
      </section>
    </div>
  );
}
