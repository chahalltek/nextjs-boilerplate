// app/admin/lineup-lab/rosters/[id]/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getRoster, saveRoster } from "@/lib/roster/store";
import type { RosterRules, UserRoster } from "@/lib/roster/types";

type Scoring = UserRoster["scoring"];

async function actionSave(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "");

  const playersRaw = String(formData.get("players") || "");
  const players = playersRaw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const scoring = (String(formData.get("scoring") || "PPR") as Scoring) ?? "PPR";
  const optInEmail = String(formData.get("optInEmail") || "") === "on";

  const rules: RosterRules = {
    QB: Number(formData.get("QB") || 1),
    RB: Number(formData.get("RB") || 2),
    WR: Number(formData.get("WR") || 2),
    TE: Number(formData.get("TE") || 1),
    FLEX: Number(formData.get("FLEX") || 1),
    DST: Number(formData.get("DST") || 1),
    K: Number(formData.get("K") || 1),
  };

  const pinsFlexRaw = String(formData.get("pinsFlex") || "");
  const pinsFlex = pinsFlexRaw
    ? pinsFlexRaw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const pins = { FLEX: pinsFlex };

  await saveRoster(id, {
    name,
    email,
    players,
    rules,
    scoring,
    optInEmail,
    pins,
  });
}

export default async function RosterEditPage({
  params,
}: {
  params: { id: string };
}) {
  const roster = await getRoster(params.id);

  if (!roster) {
    return (
      <main className="container max-w-3xl py-8">
        <h1 className="text-2xl font-bold">Roster not found</h1>
        <p className="text-white/70 mt-2">ID: {params.id}</p>
      </main>
    );
  }

  const playersText = (roster.players || []).join("\n");
  const pinsFlex = roster.pins?.FLEX?.join(", ") || "";
  const rules = roster.rules;

  return (
    <main className="container max-w-3xl py-8 space-y-6">
      <h1 className="text-2xl font-bold">Edit Roster</h1>
      <form action={actionSave} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <input type="hidden" name="id" defaultValue={roster.id} />

        <label className="text-sm">Team Name</label>
        <input
          name="name"
          defaultValue={roster.name || ""}
          className="bg-transparent border border-white/10 rounded px-2 py-1"
        />

        <label className="text-sm">Email</label>
        <input
          name="email"
          defaultValue={roster.email || ""}
          className="bg-transparent border border-white/10 rounded px-2 py-1"
        />

        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {(["QB", "RB", "WR", "TE", "FLEX", "DST", "K"] as const).map((k) => (
            <label key={k} className="flex flex-col text-xs">
              <span className="text-white/60">{k}</span>
              <input
                type="number"
                name={k}
                min={0}
                max={8}
                defaultValue={rules[k]}
                className="bg-transparent border border-white/15 rounded px-2 py-1"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Scoring</span>
          <select
            name="scoring"
            defaultValue={roster.scoring || "PPR"}
            className="bg-transparent border border-white/15 rounded px-2 py-1 text-sm"
          >
            <option value="PPR">PPR</option>
            <option value="HALF_PPR">Half-PPR</option>
            <option value="STD">Standard</option>
          </select>
          <label className="text-xs text-white/80 inline-flex items-center gap-2 ml-4">
            <input type="checkbox" name="optInEmail" defaultChecked={!!roster.optInEmail} />
            Send lineup by email
          </label>
        </div>

        <label className="text-sm">Players (Sleeper IDs — comma/space/line separated)</label>
        <textarea
          name="players"
          className="min-h-32 bg-transparent border border-white/10 rounded p-2"
          defaultValue={playersText}
        />

        <label className="text-sm">Pins → FLEX (IDs, comma/space/line separated)</label>
        <textarea
          name="pinsFlex"
          className="min-h-16 bg-transparent border border-white/10 rounded p-2"
          defaultValue={pinsFlex}
        />

        <div className="flex gap-2">
          <button className="btn-gold">Save</button>
          <RecomputeNow id={roster.id} />
        </div>
      </form>
    </main>
  );
}

function RecomputeNow({ id }: { id: string }) {
  async function act(formData: FormData) {
    "use server";
    const week = Number(formData.get("week") || 1);
    const notify = String(formData.get("notify") || "") === "on" ? 1 : 0;
    // Call existing cron route
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cron/roster-digest?id=${encodeURIComponent(
        id
      )}&week=${week}&notify=${notify}`,
      { cache: "no-store" }
    ).catch(() => {});
  }

  return (
    <form action={act} className="flex items-center gap-2">
      <label className="text-sm">Week</label>
      <input
        name="week"
        type="number"
        min={1}
        max={18}
        defaultValue={1}
        className="w-20 bg-transparent border border-white/10 rounded px-2 py-1"
      />
      <label className="text-xs text-white/80 inline-flex items-center gap-2">
        <input name="notify" type="checkbox" defaultChecked />
        Email if changed
      </label>
      <button className="border border-white/20 rounded px-3 py-2 text-sm hover:bg-white/10">
        Recompute now
      </button>
    </form>
  );
}
