// app/admin/lineup-lab/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";

/* ---------------- Server actions ---------------- */

/**
 * Trigger the Lineup Lab digest for a single roster.
 *
 * Instructions:
 * - Provide a Roster ID (the short id users see on /roster).
 * - Week is optional; leave blank to let the digest use the current NFL week.
 * - Check “Notify user” to send an email only if the lineup meaningfully changed
 *   (the cron compares hashes before emailing).
 *
 * Implementation notes:
 * - Calls the existing /api/cron/roster-digest endpoint with query params:
 *     ?roster=<id>&week=<n>&notify=0|1
 * - GET is used (idempotent); we catch/return any error text for visibility.
 */
async function actionTriggerDigest(formData: FormData) {
  "use server";
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const roster = String(formData.get("roster") || "").trim();
  const weekRaw = String(formData.get("week") || "").trim();
  const notify = formData.get("notify") ? "1" : "0";
  const params = new URLSearchParams();
  if (roster) params.set("roster", roster);
  if (weekRaw) params.set("week", weekRaw);
  params.set("notify", notify);

  if (!roster) {
    return { ok: false, msg: "Please provide a roster id." };
  }

  try {
    const url = `${base}/api/cron/roster-digest?${params.toString()}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await res.text();
    return res.ok
      ? { ok: true, msg: `Digest triggered for ${roster}${weekRaw ? ` (wk ${weekRaw})` : ""}.` }
      : { ok: false, msg: `Digest call failed: ${text || res.status}` };
  } catch (e: any) {
    return { ok: false, msg: `Digest error: ${e?.message || String(e)}` };
  }
}

/**
 * Warm/refresh the Player Name cache used by search & emails.
 *
 * Instructions:
 * - Click to (re)prime the in-memory/KV name index so search & email
 *   rendering show names/positions/teams quickly.
 * - This is safe to run anytime. It’s lightweight: we just hit the search API.
 *
 * Implementation notes:
 * - We call /api/players/search with a minimal query (q=a) to ensure the index
 *   loads and stays warm. If you later add a dedicated rebuild endpoint,
 *   point this action at it instead.
 */
async function actionRefreshNameCache() {
  "use server";
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    const url = `${base}/api/players/search?q=a&limit=1`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) return { ok: false, msg: `Search warmup failed: ${res.status}` };
    return { ok: true, msg: "Name cache primed." };
  } catch (e: any) {
    return { ok: false, msg: `Warmup error: ${e?.message || String(e)}` };
  }
}

/**
 * Backfill names on recent saved lineups so emails & UI show names (not ids).
 *
 * Instructions:
 * - Choose a lookback window (in days). We’ll iterate recent lineups and
 *   attach name/meta where missing.
 * - Use this after you switch providers or change the name-map structure.
 *
 * Implementation notes:
 * - This action calls a best-effort maintenance URL. If you haven’t created
 *   a dedicated endpoint yet, it will no-op gracefully.
 * - Recommended to implement a POST /api/cron/backfill-lineup-names with
 *   a `days` query param on the server that reads/saves affected lineups.
 */
async function actionBackfillNames(formData: FormData) {
  "use server";
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const days = Number(String(formData.get("days") || "14"));
  if (!Number.isFinite(days) || days <= 0) {
    return { ok: false, msg: "Please provide a positive number of days." };
  }
  try {
    const url = `${base}/api/cron/backfill-lineup-names?days=${days}`;
    const res = await fetch(url, { method: "POST", cache: "no-store" });
    const text = await res.text();
    return res.ok
      ? { ok: true, msg: `Backfill kicked off for ~${days} day(s).` }
      : { ok: false, msg: `Backfill call failed: ${text || res.status}` };
  } catch (e: any) {
    // Graceful no-op if endpoint not present
    return {
      ok: false,
      msg:
        "Backfill endpoint not found yet. Create POST /api/cron/backfill-lineup-names?days=N to wire this up.",
    };
  }
}

/* ---------------- UI ---------------- */

export default async function LineupLabAdmin() {
  return (
    <main className="container max-w-4xl py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Lineup Lab — Admin</h1>
        <p className="text-white/70 text-sm">
          Tools for digest runs, player-name cache, and name backfills.
        </p>
      </header>

      {/* Trigger digest */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Trigger Lineup Digest (single roster)</h2>
        <p className="text-sm text-white/70">
          Provide a roster id (from the user’s Lineup Lab page). Week is optional; leave
          blank to use the current NFL week. “Notify user” sends an email only when the
          computed lineup meaningfully changes.
        </p>
        <form action={actionTriggerDigest} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Roster ID</span>
            <input
              name="roster"
              placeholder="e.g. 3bd20a1f-…"
              className="rounded border border-white/15 bg-transparent px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Week (optional)</span>
            <input
              name="week"
              placeholder="auto"
              type="number"
              min={1}
              max={18}
              className="rounded border border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="inline-flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="notify" className="rounded border-white/20 bg-transparent" />
            <span className="text-sm text-white/80">Notify user if lineup changed</span>
          </label>
          <div className="sm:col-span-2">
            <button className="btn-gold">Run digest</button>
          </div>
        </form>
      </section>

      {/* Refresh name cache */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Refresh Player Name Cache</h2>
        <p className="text-sm text-white/70">
          (Re)primes the name/position/team lookup used in search and emails. Safe to run
          anytime; useful after deployments or warm starts.
        </p>
        <form action={actionRefreshNameCache}>
          <button className="rounded border border-white/20 px-3 py-2 hover:bg-white/10">
            Warm/Refresh
          </button>
        </form>
      </section>

      {/* Backfill names */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Backfill Names on Recent Lineups</h2>
        <p className="text-sm text-white/70">
          Goes back through recent saved lineups and attaches name metadata where missing,
          so historical emails/UI show names instead of ids. Pick a lookback window.
        </p>
        <form action={actionBackfillNames} className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Days to backfill</span>
            <input
              name="days"
              type="number"
              min={1}
              max={90}
              defaultValue={14}
              className="rounded border border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <button className="rounded border border-white/20 px-3 py-2 hover:bg-white/10">
            Backfill
          </button>
        </form>
        <p className="text-xs text-white/50">
          Note: if you haven’t created the backfill endpoint yet, this will no-op with a
          friendly message. Recommended: implement{" "}
          <code className="px-1 py-0.5 rounded bg-black/40 border border-white/10">
            POST /api/cron/backfill-lineup-names?days=N
          </code>
          .
        </p>
      </section>

      <footer className="pt-2 text-xs text-white/50">
        Need the roster id? Ask the user to open <Link href="/roster" className="underline">Lineup Lab</Link>; it’s shown under the “Save Changes” button.
      </footer>
    </main>
  );
}
