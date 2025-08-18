// app/start-sit/page.jsx
import Link from "next/link";
import InjuryTicker from "@/components/InjuryTicker";

export const metadata = {
  title: "Start/Sit — Hey Skol Sister",
  description: "Weekly Start/Sit calls with injury updates and matchup notes.",
};

export default function StartSitPage() {
  return (
    <div className="container py-12 space-y-8">
      {/* Ticker at the very top */}
      <section aria-labelledby="injury-report-heading">
        <h2 id="injury-report-heading" className="text-xl font-semibold mb-3">
          Injury Report
        </h2>
        <InjuryTicker />
      </section>

      {/* Page header below the ticker */}
      <header>
        <h1 className="text-4xl font-bold">Start / Sit</h1>
        <p className="mt-2 text-white/70">
          Latest injury report to help with your start/sit decisions.
        </p>
      </header>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3">
        <Link href="/subscribe" className="btn-gold inline-flex items-center justify-center">
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
