import { getOverrides, setOverrides } from "@/lib/roster/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function actionSave(formData: FormData) {
  "use server";
  const week = Number(formData.get("week") || "1");
  const note = String(formData.get("note") || "");

  // Parse JSON blobs from the form
  const rawPointDelta = safeJson(formData.get("pointDelta"));
  const rawForceStart  = safeJson(formData.get("forceStart"));
  const rawForceSit    = safeJson(formData.get("forceSit"));

  // Coerce to the right shapes for setOverrides
  const pointDelta = toNumberMap(rawPointDelta);            // Record<string, number> | undefined
  const forceStart = toBoolMap(rawForceStart);              // Record<string, boolean> | undefined
  const forceSit   = toBoolMap(rawForceSit);                // Record<string, boolean> | undefined

  await setOverrides(week, { note, pointDelta, forceStart, forceSit });
}

function safeJson(v: any) {
  try { return v ? JSON.parse(String(v)) : undefined; } catch { return undefined; }
}

function toNumberMap(v: any): Record<string, number> | undefined {
  if (!v) return undefined;
  if (typeof v === "object" && !Array.isArray(v)) {
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(v)) {
      const n = Number(val);
      if (!Number.isNaN(n)) out[k] = n;
    }
    return Object.keys(out).length ? out : undefined;
  }
  // allow array of tuples: [["player_id", 1.5], ...]
  if (Array.isArray(v)) {
    const out: Record<string, number> = {};
    for (const item of v) {
      if (Array.isArray(item) && typeof item[0] === "string") {
        const n = Number(item[1]);
        if (!Number.isNaN(n)) out[item[0]] = n;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

function toBoolMap(v: any): Record<string, boolean> | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) {
    const out: Record<string, boolean> = {};
    for (const id of v) if (typeof id === "string" && id.trim()) out[id] = true;
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof v === "object") {
    const out: Record<string, boolean> = {};
    for (const [k, val] of Object.entries(v)) out[k] = Boolean(val);
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

export default async function RosterAdmin() {
  const week = 1;
  const current = await getOverrides(week);

  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">Skol Coach — Admin Overrides</h1>
      <p className="text-white/70 text-sm">
        Add global nudges for this week. Use Sleeper <code>player_id</code> keys.
      </p>

      <form action={actionSave} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm w-24">Week</label>
          <input
            name="week"
            defaultValue={week}
            className="w-24 bg-transparent border border-white/10 rounded px-2 py-1"
          />
        </div>

        <label className="text-sm">Point Delta (JSON)</label>
        <textarea
          name="pointDelta"
          className="min-h-24 bg-transparent border border-white/10 rounded p-2 font-mono text-sm"
          defaultValue={JSON.stringify(current.pointDelta || {}, null, 2)}
          placeholder='Object or array of tuples, e.g. { "p_123": 1.5 } or [["p_123", 1.5]]'
        />

        <label className="text-sm">Force Start (JSON)</label>
        <textarea
          name="forceStart"
          className="min-h-24 bg-transparent border border-white/10 rounded p-2 font-mono text-sm"
          defaultValue={
            // show as array in the textarea for readability
            JSON.stringify(Object.keys(current.forceStart || {}), null, 2)
          }
          placeholder='Array or object, e.g. ["p_123","p_456"] or { "p_123": true }'
        />

        <label className="text-sm">Force Sit (JSON)</label>
        <textarea
          name="forceSit"
          className="min-h-24 bg-transparent border border-white/10 rounded p-2 font-mono text-sm"
          defaultValue={JSON.stringify(Object.keys(current.forceSit || {}), null, 2)}
          placeholder='Array or object, e.g. ["p_789"] or { "p_789": true }'
        />

        <label className="text-sm">Note</label>
        <input
          name="note"
          className="bg-transparent border border-white/10 rounded px-2 py-1"
          defaultValue={current.note || ""}
          placeholder="Short note about this week's adjustments"
        />

        <button className="btn-gold w-fit">Save Overrides</button>
      </form>
    </main>
  );
}
