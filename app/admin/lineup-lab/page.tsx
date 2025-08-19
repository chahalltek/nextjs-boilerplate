// app/admin/lineup-lab/page.tsx
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ACTION 1: Backfill lineup names
 * --------------------------------
 * Purpose:
 *   Ensure the (id -> {name,pos,team}) name map is stored per roster/week.
 *   Useful after you’ve computed a lineup but want pretty names in emails/UI.
 *
 * How it works:
 *   Calls /api/cron/backfill-lineup-names?id=<rosterId>&week=<week>
 *   The API will look up the latest lineup, build a name map, and persist it.
 *
 * When to use:
 *   - After importing rosters
 *   - After changing your player-name source
 *   - Before sending a digest if you see raw IDs in previews
 */
async function actionBackfillLineupNames(formData: FormData): Promise<void> {
  "use server";
  const id = String(formData.get("rosterId") || "").trim();
  const week = Number(formData.get("week") || "0");
  if (!id || !Number.isFinite(week) || week <= 0) return;

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    await fetch(`${base}/api/cron/backfill-lineup-names?id=${encodeURIComponent(id)}&week=${week}`, {
      method: "POST",
      cache: "no-store",
    });
  } catch (e) {
    console.error("backfill-lineup-names error:", e);
  }
}

/**
 * ACTION 2: Trigger digest (recompute & optionally email)
 * ------------------------------------------------------
 * Purpose:
 *   Recompute the lineup now and, if notify=1, send the email immediately.
 *
 * How it works:
 *   Calls /api/roster/recompute?id=<rosterId>&week=<week>&notify=1|0
 *   The API recomputes the lineup, saves it, and (optionally) sends the email.
 *
 * When to use:
 *   - You updated Admin Overrides and want a fresh recommendation
 *   - A manager updated their roster and asked for a quick re-send
 */
async function actionTriggerDigest(formData: FormData): Promise<void> {
  "use server";
  const id = String(formData.get("rosterId") || "").trim();
  const week = Number(formData.get("week") || "0");
  const notify = String(formData.get("notify") || "0") === "1" ? 1 : 0;
  if (!id || !Number.isFinite(week) || week <= 0) return;

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    await fetch(`${base}/api/roster/recompute?id=${encodeURIComponent(id)}&week=${week}&notify=${notify}`, {
      method: "POST",
      cache: "no-store",
    });
  } catch (e) {
    console.error("trigger-digest error:", e);
  }
}

/**
 * ACTION 3: Clear lineup (for a given roster/week)
 * ------------------------------------------------
 * Purpose:
 *   Remove a saved computed lineup so the next request must recompute.
 *
 * How it works:
 *   Calls /api/roster/clear-lineup?id=<rosterId>&week=<week>
 *   (Implement this route to kv.del the saved lineup key.)
 *
 * When to use:
 *   - You suspect stale data
 *   - You changed core scoring/rules and want a clean recompute
 */
async function actionClearLineup(formData: FormData): Promise<void> {
  "use server";
  const id = String(formData.get("rosterId") || "").trim();
  const week = Number(formData.get("week") || "0");
  if (!id || !Number.isFinite(week) || week <= 0) return;

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    await fetch(`${base}/api/roster/clear-lineup?id=${encodeURIComponent(id)}&week=${week}`, {
      method: "POST",
      cache: "no-store",
    });
  } catch (e) {
    console.error("clear-lineup error:", e);
  }
}

export default function LineupLabAdmin() {
  return (
    <main className="container max-w-4xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Lineup Lab — Admin</h1>
        <p className="text-white/70 text-sm">
          Tools for recomputing lineups, backfilling names, and clearing cached results.
        </p>
      </header>

      {/* Helper links */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <div className="flex flex-wrap gap-3">
          <Link href="/admin" className="underline hover:no-underline">← Admin Home</Link>
          <Link href="/admin/roster" className="underline hover:no-underline">Roster Admin</Link>
          <Link href="/roster" className="underline hover:no-underline">Lineup Lab (client)</Link>
        </div>
      </div>

      {/* Card 1: Backfill lineup names */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 grid gap-3">
        <h2 className="font-semibold">Backfill Lineup Names</h2>
        <p className="text-sm text-white/70">
          Builds/stores the player name map for a specific roster + week so emails and UI display names
          (not IDs). Safe to run multiple times; it’s idempotent.
        </p>
        <form action={actionBackfillLineupNames} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Roster ID</span>
            <input name="rosterId" required className="bg-transparent border border-white/15 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Week</span>
            <input name="week" type="number" min={1} max={18} required className="bg-transparent border border-white/15 rounded px-2 py-1" />
          </label>
          <div className="sm:col-span-2">
            <button className="btn-gold">Backfill</button>
          </div>
        </form>
      </section>

      {/* Card 2: Recompute + (optional) email */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 grid gap-3">
        <h2 className="font-semibold">Recompute Lineup &amp; (Optional) Send Email</h2>
        <p className="text-sm text-white/70">
          Recomputes a roster’s lineup for a given week and can immediately send the email. Use notify=0
          to only recompute; use notify=1 to email if the computed lineup meaningfully changes.
        </p>
        <form action={actionTriggerDigest} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Roster ID</span>
            <input name="rosterId" required className="bg-transparent border border-white/15 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Week</span>
            <input name="week" type="number" min={1} max={18} required className="bg-transparent border border-white/15 rounded px-2 py-1" />
          </label>
          <label className="flex items-center gap-2">
            <input name="notify" type="checkbox" value="1" className="rounded border-white/20 bg-transparent" />
            <span className="text-sm text-white/80">Send email if changed</span>
          </label>
          <div className="sm:col-span-2">
            <button className="btn-gold">Recompute</button>
          </div>
        </form>
      </section>

      {/* Card 3: Clear saved lineup */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 grid gap-3">
        <h2 className="font-semibold">Clear Saved Lineup</h2>
        <p className="text-sm text-white/70">
          Deletes the stored lineup for a roster/week. The next request will recompute from scratch.
        </p>
        <form action={actionClearLineup} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Roster ID</span>
            <input name="rosterId" required className="bg-transparent border border-white/15 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/70">Week</span>
            <input name="week" type="number" min={1} max={18} required className="bg-transparent border border-white/15 rounded px-2 py-1" />
          </label>
          <div className="sm:col-span-2">
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Clear</button>
          </div>
        </form>
      </section>
    </main>
  );
}
