// app/start-sit/page.jsx
import Link from "next/link";

export const metadata = {
  title: "Start/Sit — Skol Sisters",
  description: "Weekly Start/Sit calls. Preseason mode: stretching, hydration, and wild optimism.",
};

export default function StartSitPage() {
  return (
    <div className="container py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Start / Sit</h1>
        <p className="mt-2 text-white/70">
          Preseason mode: no official calls yet. We’re still scouting, the spreadsheets are carbo-loading,
          and our hot takes are cooling on a rack. 🔥🥵➡️🧊
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="card p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-3">What to expect once the season kicks off</h2>
          <ul className="list-disc pl-5 space-y-2 text-white/80">
            <li>Weekly Start/Sit calls with just enough spice to ruin a group chat.</li>
            <li>Risk ratings, matchup notes, and “don’t overthink it” alarms.</li>
            <li>Receipts—because victory laps taste better when documented.</li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/subscribe" className="btn-gold">Notify me when it drops</Link>
            <Link href="/101" className="cta-card">
              <span className="cta-title">Start with 101 →</span>
              <span className="cta-sub">New to fantasy? We got you.</span>
            </Link>
          </div>
        </section>

        <aside className="card p-6">
          <h3 className="text-lg font-semibold mb-2">Preseason Start/Sit (very scientific)</h3>
          <ul className="space-y-2 text-white/80">
            <li>🧴 Sunscreen — <span className="font-semibold text-[color:var(--color-skol-gold)]">START</span></li>
            <li>🗣️ July hot takes — <span className="font-semibold">SIT</span></li>
            <li>🍗 White jersey at a BBQ — <span className="font-semibold">SIT</span></li>
            <li>🔔 Notifications — <span className="font-semibold text-[color:var(--color-skol-gold)]">START</span> (hit “Notify me”)</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
