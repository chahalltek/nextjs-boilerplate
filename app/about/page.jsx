// app/about/page.jsx
import Link from "next/link";

export const metadata = {
  title: "About — The Skol Sisters",
  description:
    "Women-led, judgment-free fantasy football guidance. 30 years of playing, 15 years commissioning women-only leagues. Skol!",
  alternates: { canonical: "/about" },
};

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-white/15 bg-white/5">
      {children}
    </span>
  );
}

function Card({ title, icon, children }) {
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

/* --- Minimal, dependency-free SVGs --- */
function HeartSkol() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="skol" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#4F2683" />
          <stop offset="100%" stopColor="#FFC62F" />
        </linearGradient>
      </defs>
      <path
        d="M32 56C10 42 6 28 12 20c4-5 14-6 20 2 6-8 16-7 20-2 6 8 2 22-20 36z"
        fill="url(#skol)"
        stroke="#2a154c"
        strokeWidth="2"
      />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="20" cy="22" r="8" fill="#FFC62F" />
      <circle cx="44" cy="22" r="8" fill="#4F2683" />
      <circle cx="32" cy="36" r="10" fill="#ffffff" fillOpacity="0.85" />
      <path d="M10 50c4-8 14-12 22-12s18 4 22 12" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3" fill="none" />
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

function FieldBanner() {
  return (
    <svg viewBox="0 0 1200 220" role="img" aria-label="Stylized football field"
         className="w-full rounded-2xl border border-white/10 shadow-lg">
      <defs>
        <linearGradient id="grass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0F4020" />
          <stop offset="100%" stopColor="#0C3319" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="220" fill="url(#grass)" />
      {Array.from({ length: 21 }).map((_, i) => (
        <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="220" stroke="white" strokeOpacity="0.2" />
      ))}
      <rect x="0" y="0" width="24" height="220" fill="#4F2683" />
      <rect x="1176" y="0" width="24" height="220" fill="#FFC62F" />
      <circle cx="600" cy="110" r="56" fill="none" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="2" />
      <ellipse cx="600" cy="110" rx="28" ry="14" fill="#7A3E1A" stroke="#3F1F0D" strokeWidth="3" />
      <path d="M592 110h16" stroke="#fff" strokeWidth="2" />
      <path d="M596 106l8 8M596 114l8-8" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="container py-10 max-w-5xl">
      {/* Hero */}
      <section className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">About The Skol Sisters</h1>
          <p className="mt-4 text-white/80">
            Hi! I’ve played fantasy football for <strong>30 years</strong> and I’ve been the
            commissioner of <strong>women-only leagues for 15 years</strong>. If you’re brand new
            or you’re chasing a title, you’re welcome here—no gatekeeping, just smart, sisterly help.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>Women-led</Badge>
            <Badge>Beginner-friendly</Badge>
            <Badge>Actionable strategy</Badge>
          </div>
        </div>
        <FieldBanner />
      </section>

      {/* Story + Vikings love */}
      <section className="mt-12 grid gap-6 md:grid-cols-3">
        <Card title="Why we exist" icon={<CommunityIcon />}>
          Fantasy is more fun together. We create a judgment-free space to learn, trade ideas, and
          win—whether it’s your first season or your tenth playoff run.
        </Card>
        <Card title="My fandom (Skol!)" icon={<HeartSkol />}>
          We all have a team we love. Mine is the <strong>Minnesota Vikings</strong>. When your team’s
          in a “rebuilding year,” fantasy keeps Sundays exciting—because <em>your</em> roster spans the whole league.
        </Card>
        <Card title="How we help" icon={<WhistleIcon />}>
          Clear explainers, draft plans, weekly Start/Sit tiers, waiver targets, and trade ideas—
          all season long. No jargon wall, no talking down.
        </Card>
      </section>

      {/* Five phases */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold">The 5 phases of a winning season</h2>
        <ol className="mt-4 text-white/80 space-y-4">
          <li>
            <strong>1) Drafting</strong> — We’ll share weekly tips this month: tiers, positional cliffs,
            and players to target so you leave with a balanced, high-upside roster.
          </li>
          <li>
            <strong>2) Managing Your Team</strong> — Waivers, trades, and tilt control. Stay steady, use trends,
            and make moves with intent.
          </li>
          <li>
            <strong>3) Stack Your Bench</strong> — Prioritize contingent value and upside over low-ceiling depth.
          </li>
          <li>
            <strong>4) Prepare for Playoffs</strong> — Scout Weeks 15–17, leverage schedules, and stash breakout shots.
          </li>
          <li>
            <strong>5) Playoffs</strong> — Optimize for weekly ceilings and matchup leverage.
          </li>
        </ol>
        <p className="mt-3 text-white/70 text-sm">
          We’ll also track preseason injuries and suspensions—surprises happen every year, and we’ll help you capitalize on them.
        </p>
      </section>

      {/* CTA */}
      <section className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center justify-between gap-4 flex-col md:flex-row">
          <div className="not-prose mt-10 grid gap-4 sm:grid-cols-2">
  <Link href="/101" className="cta-card">
    <div className="cta-title">Start with 101</div>
    <div className="cta-sub">New here? This quick primer has you.</div>
  </Link>

  <Link href="/contact" className="cta-card">
    <div className="cta-title">Contact us</div>
    <div className="cta-sub">Have a tip, idea, or request? We read every message.</div>
  </Link>
</div>
        </div>
      </section>
    </div>
  );
}
