// app/admin/analytics/page.tsx
import { headers } from "next/headers";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlausibleAgg = { results?: Record<string, number> };

/** Always return a valid absolute origin */
function getBaseUrl(): string {
  // 1) Strongest signal: explicit env
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  // 2) Vercel automatic domain
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  // 3) Request headers (works on server-rendered pages)
  try {
    const h = headers();
    const proto = (h.get("x-forwarded-proto") || "https").replace(/[^a-z]+/gi, "");
    const host =
      h.get("x-forwarded-host") ||
      h.get("host") ||
      "localhost:3000";
    return `${proto}://${host}`;
  } catch {
    // 4) Last resort for local/dev tools
    return "http://localhost:3000";
  }
}

/** Build an absolute URL safely */
function makeUrl(path: string): string {
  // already absolute?
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, getBaseUrl()).toString();
}

async function fetchJSON<T = any>(path: string): Promise<T> {
  const url = makeUrl(path);
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.ADMIN_API_KEY || ""}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${url} ${res.status}${txt ? ` — ${txt}` : ""}`);
  }
  return res.json();
}

// Return a safe aggregate object (avoids TS issues if results is missing)
function toAgg(x: PlausibleAgg | null): Record<string, number> {
  if (x && typeof x === "object" && x.results && typeof x.results === "object") {
    return x.results as Record<string, number>;
  }
  return {};
}

export default async function AdminAnalytics() {
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

  const agg = toAgg(plausible);
  const fmt = (n: number | undefined) => (typeof n === "number" ? n.toLocaleString() : "—");

  return (
    <main className="container max-w-5xl py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Admin Analytics</h1>
        <p className="text-white/70">Traffic, audience and delivery summaries (server-side).</p>
      </header>

      {/* Site Analytics */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold mb-3">Site Analytics (last 30 days)</h2>
        {plausibleErr ? (
          <p className="text-sm text-red-300">{plausibleErr}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Visitors" value={fmt(agg.visitors)} />
            <Stat label="Pageviews" value={fmt(agg.pageviews)} />
            <Stat
              label="Bounce rate"
              value={typeof agg.bounce_rate === "number" ? `${agg.bounce_rate.toFixed(1)}%` : "—"}
            />
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
        Ensure <code>ADMIN_API_KEY</code> matches your middleware, and set{" "}
        <code>NEXT_PUBLIC_SITE_URL</code> (e.g. <code>https://heyskolsister.com</code>) in Vercel.
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
