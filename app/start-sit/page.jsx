// app/start-sit/page.jsx
import Link from "next/link";
import { getInjuredPlayers } from "@/lib/sleeper";

export const metadata = {
  title: "Start/Sit — Hey Skol Sister",
 description: "Weekly Start/Sit calls with injury updates and matchup notes.",
};

export default async function StartSitPage() {
  const injuries = await getInjuredPlayers();

  return (
    <div className="container py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Start / Sit</h1>
        <p className="mt-2 text-white/70">
          Latest injury report to help with your start/sit decisions.
        </p>
      </header>

      <section className="card p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Injury Report</h2>
        <ul className="space-y-3">
          {injuries.map((p) => (
            <li key={p.player_id} className="border-b border-white/10 pb-2">
              <p className="font-semibold">
                {p.full_name} {p.team ? `(${p.team} ${p.position})` : ""}
              </p>
              <p className="text-sm text-white/70">
                {p.injury_status}
                {p.injury_note ? ` – ${p.injury_note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

        <div className="flex flex-wrap gap-3">
        <Link href="/subscribe" className="btn-gold">
          Notify me when weekly picks drop
        </Link>
        <Link href="/101" className="cta-card">
          <span className="cta-title">Start with 101 → </span>
          <span className="cta-sub">New to fantasy? We got you.</span>
        </Link>
      </div>
    </div>
  );
}
