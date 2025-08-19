import { getOverrides, setOverrides } from "@/lib/roster/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function actionSave(formData: FormData) {
  "use server";
  const week = Number(formData.get("week") || "1");
  const note = String(formData.get("note") || "");
  // Expect JSON blocks for deltas/forces
  const pointDelta = safeJson(formData.get("pointDelta"));
  const forceStart  = safeJson(formData.get("forceStart"));
  const forceSit    = safeJson(formData.get("forceSit"));
  await setOverrides(week, { week, note, pointDelta, forceStart, forceSit });
}

function safeJson(v: any) {
  try { return v ? JSON.parse(String(v)) : undefined; } catch { return undefined; }
}

export default async function RosterAdmin() {
  const week = 1;
  const current = await getOverrides(week);

  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">Skol Coach — Admin Overrides</h1>
      <p className="text-white/70 text-sm">Add global nudges for this week. Use Sleeper player_id keys.</p>

      <form action={actionSave} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm w-24">Week</label>
          <input name="week" defaultValue={week} className="w-24 bg-transparent border border-white/10 rounded px-2 py-1" />
        </div>

        <label className="text-sm">Point Delta (JSON)</label>
        <textarea name="pointDelta" className="min-h-24 bg-transparent border border-white/10 rounded p-2"
          defaultValue={JSON.stringify(current.pointDelta || {}, null, 2)} />

        <label className="text-sm">Force Start (JSON)</label>
        <textarea name="forceStart" className="min-h-24 bg-transparent border border-white/10 rounded p-2"
          defaultValue={JSON.stringify(current.forceStart || {}, null, 2)} />

        <label className="text-sm">Force Sit (JSON)</label>
        <textarea name="forceSit" className="min-h-24 bg-transparent border border-white/10 rounded p-2"
          defaultValue={JSON.stringify(current.forceSit || {}, null, 2)} />

        <label className="text-sm">Note</label>
        <input name="note" className="bg-transparent border border-white/10 rounded px-2 py-1"
          defaultValue={current.note || ""} />

        <button className="btn-gold w-fit">Save Overrides</button>
      </form>
    </main>
  );
}
