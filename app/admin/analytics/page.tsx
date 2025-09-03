// app/admin/analytics/page.tsx
import { headers } from "next/headers";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlausibleAgg = {
  results?: Record<string, number>;
};

function getBaseUrl() {
  // Prefer explicit site URL in prod if you’ve set it
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;

  // Fall back to request headers (Vercel / proxies)
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchJSON<T = any>(path: string): Promise<T> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${process.env.ADMIN_API_KEY || ""}`,
      accept: "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${base}${path} ${res.status}${txt ? ` — ${txt}` : ""}`);
  }
  return res.json();
}

export default async function AdminAnalytics() {
  // Load all three panes; show per-card errors if any fail
  let plausible: PlausibleAgg | null = null;
  let plausibleErr: string | null = null;

  let mailchimp: any = null;
  let mcErr: string | null = null;

  let resend: any = null;
  let resendErr: string | null = null;

  await Promise.allSettled([
    (async () => {
      try {
        plausible = await fetchJSON<PlausibleAgg>("/api/admin/analytics");
      } catch (e: any) {
        plausibleErr = `Unable to load analytics: ${e.message}`;
      }
    })(),
    (async () => {
      try {
        mailchimp = await fetchJSON("/api/admin/mailchimp");
      } catch (e: any) {
        mcErr = `Unable to load Mailchimp: ${e.message}`;
      }
    })(),
    (async () => {
      try {
        resend = await fetchJSON("/api/admin/resend");
      } catch (e: any) {
        resendErr = `Unable to load Resend: ${e.message}`;
      }
    })(),
  ]);

  const agg = plausible?.results || {};
  const fmt = (n: number | undefined) =>
    typeof n === "number" ? n.toLocaleString() : "—";

  return (
    <main className="container max-w-5xl py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Admin Analytics</h1>
        <p className="text-white/70">
          Traffic, audience and delivery summaries (server-side).
        </p>
      </header>

      {/* Site Analytics */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold mb-3">Site Analytics (last 30 days)</h2>
        {plausibleErr ? (
          <p className="text-sm text-red-300">{plausibleErr}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Visitors" value={fmt(agg.visitors as number)} />
            <Stat label="Pageviews" value={fmt(agg.pageviews as number)} />
            <Stat label="Bounce rate" value={typeof agg.bounce_rate === "number" ? `${agg.bounce_rate.toFixed(1)}%` : "—"} />
            <Stat
              label="Avg visit"
              value={
                typeof agg.visit_duration === "number"
                  ? `${Math.round(agg.visit_duration / 60)}m ${Math.round(agg.visit_duration % 60)}s`
                  : "—"
              }
            />
          </div>
        )}
      </section>

      {/* Email & Audience */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Email & Audience</h2>

        {/* Mailchimp */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold mb-2">Mailchimp Audience</h3>
          {mcErr ? (
            <p className="text-sm text-red-300">{mcErr}</p>
          ) : (
            <div className="text-sm text-white/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>Total contacts: <strong>{fmt(mailchimp?.contacts)}</strong></div>
              <div>Subscribed: <strong>{fmt(mailchimp?.subscribed)}</strong></div>
              <div>Unsubscribed: <strong>{fmt(mailchimp?.unsubscribed)}</strong></div>
            </div>
          )}
        </div>

        {/* Resend */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold mb-2">Resend (last 24h)</h3>
          {resendErr ? (
            <p className="text-sm text-red-300">{resendErr}</p>
          ) : (
            <div className="text-sm text-white/80 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>Sent: <strong>{fmt(resend?.sent)}</strong></div>
              <div>Delivered: <strong>{fmt(resend?.delivered)}</strong></div>
              <div>Opened: <strong>{fmt(resend?.opened)}</strong></div>
              <div>Bounced: <strong>{fmt(resend?.bounced)}</strong></div>
            </div>
          )}
        </div>
      </section>

      <div className="text-sm">
        <Link href="/admin" className="underline">← Back to Admin</Link>
      </div>

      <p className="text-xs text-white/50">
        Make sure <code>ADMIN_API_KEY</code> is set (and matches your middleware),
        and <code>NEXT_PUBLIC_SITE_URL</code> is configured in production.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
