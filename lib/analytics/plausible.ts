// lib/analytics/plausible.ts
const API = "https://plausible.io/api/v1";
const KEY = process.env.PLAUSIBLE_API_KEY;

type AggregateResp = {
  results: {
    visitors?: { value: number };
    pageviews?: { value: number };
    bounce_rate?: { value: number };
    visit_duration?: { value: number };
  };
};

type TimeseriesResp = { results: { date: string; visitors: number }[] };

type BreakdownRow = { value: string; visitors?: number; pageviews?: number };
type BreakdownResp = { results: BreakdownRow[] };

async function getJSON<T>(url: string) {
  if (!KEY) throw new Error("PLAUSIBLE_API_KEY is not set");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${KEY}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Plausible API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function plausibleAggregate(site: string, period = "30d") {
  const metrics = ["visitors", "pageviews", "bounce_rate", "visit_duration"].join(",");
  return getJSON<AggregateResp>(`${API}/stats/aggregate?site_id=${encodeURIComponent(site)}&period=${period}&metrics=${metrics}`);
}

export async function plausibleTimeseries(site: string, period = "30d") {
  return getJSON<TimeseriesResp>(`${API}/stats/timeseries?site_id=${encodeURIComponent(site)}&period=${period}&metrics=visitors`);
}

export async function plausibleBreakdown(
  site: string,
  property: "event:page" | "visit:source" | "visit:country",
  period = "30d",
  limit = 10
) {
  return getJSON<BreakdownResp>(
    `${API}/stats/breakdown?site_id=${encodeURIComponent(site)}&period=${period}&property=${property}&limit=${limit}`
  );
}
