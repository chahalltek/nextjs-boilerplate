// app/admin/lineup-lab/cron/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listRosterIds, getRoster } from "@/lib/roster/store";

async function actionRecompute(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const week = Number(formData.get("week") || 1);
  const notify = String(formData.get("notify") || "") === "on" ? 1 : 0;

  const url = `/api/cron/roster-digest?id=${encodeURIComponent(id)}&week=${week}&notify=${notify}`;
  await fetch(url, { cache: "no-store" }).catch(() => {});
}

export default async function CronAdminPage() {
  const ids = await listRosterIds();
  const short = await Promise.all(
    ids.slice(0, 50).map(async (id) => {
      const r = await getRoster(id);
      return { id, name: r?.name || "", email: r?.email || "" };
    })
  );

  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Cron / Recompute</h1>
      <p className="text-white/70 text-sm">
        Manually trigger a recompute for a roster/week. If <b>Email if changed</b> is checked,
        the digest will email the user only when the lineup meaningfully changes.
      </p>

      <form action={actionRecompute} className="rounded-xl border border-white/10 bg-white/5 p-4 grid gap-3">
        <label className="text-sm">Roster</label>
        <select
          name="id"
          className="bg-transparent border border-white/15 rounded px-2 py-1"
          required
        >
          {short.map((r) => (
            <option key={r.id} value={r.id}>
              {(r.name?.trim() ? r.name : r.id.slice(0, 8))} — {r.email}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <label className="text-sm">Week</label>
          <input
            name="week"
            type="number"
            min={1}
            max={18}
            defaultValue={1}
            className="w-24 bg-transparent border border-white/10 rounded px-2 py-1"
          />

          <label className="text-xs text-white/80 inline-flex items-center gap-2">
            <input name="notify" type="checkbox" defaultChecked />
            Email if changed
          </label>

          <button className="btn-gold ml-auto">Recompute now</button>
        </div>
      </form>

      <div className="text-xs text-white/50">
        Tip: You can attach a scheduled hitter (e.g., Vercel Cron) to{" "}
        <code className="px-1 py-0.5 rounded bg-black/40 border border-white/10">
          /api/cron/roster-digest
        </code>{" "}
        to run weekly.
      </div>
    </main>
  );
}
