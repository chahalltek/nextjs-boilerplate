// app/start-sit/page.jsx
import Link from "next/link";
import TrendingTicker from "@/components/TrendingTicker";
import InjuryTicker from "@/components/InjuryTicker";
import ThreadBlock from "@/components/ThreadBlock";

export const metadata = {
  title: "Start/Sit — Hey Skol Sister",
  description: "Weekly Start/Sit calls with injury updates and matchup notes.",
};

export default function StartSitPage() {
  return (
    <div className="container py-12">
      {/* Ticker at very top */}
      <div className="space-y-2 mb-8">
        <p className="text-center text-sm text-white/60">Trending (hot) players</p>
        <TrendingTicker />
      </div>

      <header className="mb-8">
        <h1 className="text-4xl font-bold">Start / Sit</h1>
        <p className="mt-2 text-white/70">
          Latest injury report to help with your start/sit decisions.
        </p>
      </header>

      {/* Injury report + ticker */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Injury Report</h2>
        <InjuryTicker />
      </section>

      {/* Weekly thread (title/body/replies/reactions) */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">This Week’s Thread</h2>
        <ThreadBlock apiBase="/api/ss" />
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
