// app/admin/analytics/page.tsx
import { plausibleAggregate, plausibleBreakdown, plausibleTimeseries } from "@/lib/analytics/plausible";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARD = "rounded-xl border border-white/10 bg-white/5 p-4";

function fmt(n?: number, digits = 0) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
}
function secToMin(sec?: number) {
  if (!sec && sec !== 0) return "—";
  const m = Math.floor((sec || 0) / 60);
  const s = Math.round((sec || 0) % 60);
  return `${m}m ${s}s`;
}

export default async function AnalyticsAdmin({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const site = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const period = (typeof searchParams?.period === "string" && searchParams.period) || "30d";

  if (!site) {
    return (
      <main className="container max-w-6xl py-8 space-y-4">
        <div className={`${CARD} text-red-300 border-red-400/30 bg-red-400/10`}>
          Set <code className="font-mono">NEXT_PUBLIC_PLAUSIBLE_DOMAIN</code> and{" "}
          <code className="font-mono">PLAUSIBLE_API_KEY</code> to view analytics here.
        </div>
      </main>
    );
  }

  let agg, ts, topPages, sources;
  try {
    [agg, ts, topPages, sources] = await Promise.all([
      plausibleAggregate(site, period),
      plausibleTimeseries(site, period),
      plausibleBreakdown(site, "event:page", period, 10),
      plausibleBreakdown(site, "visit:source", period, 10),
    ]);
  } catch (e: any) {
    return (
      <main className="container max-w-6xl py-8 space-y-4">
        <div className={`${CARD} text-red-300 border-red-400/30 bg-red-400/10`}>
          Failed to load analytics: {String(e?.message || e)}
        </div>
      </main>
    );
  }

  const visitors = agg.results.visitors?.value ?? 0;
  const pageviews = agg.results.pageviews?.value ?? 0;
  const bounce = agg.results.bounce_rate?.value ?? 0;
  const dur = agg.results.visit_duration?.value ?? 0;

  return (
    <main className="container max-w-6xl py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <form className="text-sm">
          <label className="inline-flex items-center gap-2">
            <span className="opacity-70">Period</span>
            <select
              name="period"
              defaultValue={period}
              className="rounded-lg border border-white/20 bg-transparent px-2 py-1"
              onChange={(e) => {
                const sp = new URLSearchParams(window.location.search);
                sp.set("period", e.currentTarget.value);
                window.location.search = sp.toString();
              }}
            >
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="6mo">6mo</option>
              <option value="12mo">12mo</option>
            </select>
          </label>
        </form>
      </header>

      {/* KPI cards */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={CARD}><div className="text-white/60 text-sm">Visitors</div><div className="text-2xl font-semibold">{fmt(visitors)}</div></div>
        <div className={CARD}><div className="text-white/60 text-sm">Pageviews</div><div className="text-2xl font-semibold">{fmt(pageviews)}</div></div>
        <div className={CARD}><div className="text-white/60 text-sm">Bounce rate</div><div className="text-2xl font-semibold">{fmt(bounce,1)}%</div></div>
        <div className={CARD}><div className="text-white/60 text-sm">Avg. visit duration</div><div className="text-2xl font-semibold">{secToMin(dur)}</div></div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className={CARD}>
          <h2 className="text-lg font-semibold mb-2">Top pages</h2>
          <ul className="space-y-1 text-sm">
            {topPages.results.map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{r.value || "/"}</span>
                <span className="opacity-70">{fmt(r.pageviews ?? r.visitors)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={CARD}>
          <h2 className="text-lg font-semibold mb-2">Top sources</h2>
          <ul className="space-y-1 text-sm">
            {sources.results.map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{r.value || "direct / none"}</span>
                <span className="opacity-70">{fmt(r.visitors)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tiny sparkline (visitors) */}
      <section className={CARD}>
        <h2 className="text-lg font-semibold mb-2">Visitors over time</h2>
        <Sparkline data={(ts.results || []).map((r) => r.visitors)} />
      </section>
    </main>
  );
}

/* Minimal inline SVG sparkline for visitors */
function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return <div className="text-sm opacity-70">No data.</div>;
  const w = 640, h = 120, pad = 6;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const norm = (v: number) => {
    if (max === min) return h / 2;
    return h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  };
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const d = data.map((v, i) => `${i ? "L" : "M"} ${pad + i * step} ${norm(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
      <path d={d} fill="none" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" />
    </svg>
  );
}
