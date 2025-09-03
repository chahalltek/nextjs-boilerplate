// app/admin/analytics/page.tsx
import "server-only";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSummary() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/analytics/summary?period=30d`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load analytics: ${res.status} ${text || res.statusText}`);
  }
  return res.json();
}

export default async function AnalyticsAdmin() {
  let data: any;
  let error: string | null = null;

  try {
    data = await getSummary();
  } catch (e: any) {
    error = e?.message || "Unknown error";
  }

  return (
    <main className="container max-w-5xl py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Site Analytics (30 days)</h1>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["Visitors", data?.results?.visitors?.value ?? 0],
            ["Pageviews", data?.results?.pageviews?.value ?? 0],
            [
              "Bounce rate",
              data?.results?.bounce_rate?.value != null
                ? `${(data.results.bounce_rate.value as number).toFixed(1)}%`
                : "—",
            ],
            [
              "Avg. visit",
              data?.results?.visit_duration?.value != null
                ? `${Math.round(data.results.visit_duration.value / 60)}m`
                : "—",
            ],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-sm text-white/60">{label}</div>
              <div className="text-2xl font-semibold mt-1">{value as any}</div>
              {"_staleAsOf" in (data || {}) && (
                <div className="text-xs text-white/40 mt-2">
                  stale (provider error); last good:{" "}
                  {new Date((data as any)._staleAsOf).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
