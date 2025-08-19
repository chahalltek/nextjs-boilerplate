// app/admin/lineup-lab/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";

export default function LineupLabAdminHome() {
  return (
    <main className="container max-w-5xl py-8 space-y-6">
      <h1 className="text-3xl font-bold">Lineup Lab — Admin</h1>
      <p className="text-white/70">
        Manage user rosters, weekly overrides, and cron recomputes.
      </p>

      <section className="grid md:grid-cols-3 gap-4">
        <AdminCard
          title="Rosters"
          desc="Browse and edit user rosters (players, rules, scoring, pins)."
          href="/admin/lineup-lab/rosters"
          cta="Open"
        />
        <AdminCard
          title="Overrides"
          desc="Global weekly nudges: deltas, forced start/sit, notes."
          href="/admin/lineup-lab/overrides"
          cta="Open"
        />
        <AdminCard
          title="Cron / Recompute"
          desc="Trigger recomputes by roster/week. Optional email notify."
          href="/admin/lineup-lab/cron"
          cta="Open"
        />
      </section>
    </main>
  );
}

function AdminCard({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-white/70 mt-1">{desc}</p>
      <Link
        href={href}
        className="inline-block mt-4 px-3 py-2 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}
