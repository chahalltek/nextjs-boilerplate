// app/admin/survivor/page.tsx
import { getSeason, setSeason, appendBoot, recomputeLeaderboard } from "@/lib/survivor/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

/* ---------------- server actions (do NOT export) ---------------- */
async function actionSeedSeason(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId") || "").trim();
  const seasonName = String(formData.get("seasonName") || "").trim();
  const lockAtLocal = String(formData.get("lockAt") || "").trim();
  const contestantsRaw = String(formData.get("contestants") || "").trim();
  if (!seasonId || !lockAtLocal || !contestantsRaw) return;

  const lockAt = new Date(lockAtLocal);
  const contestants = contestantsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, custom] = line.split("|").map((v) => v.trim());
      return { id: custom || slugify(name), name };
    });

  // ensure unique ids
  const seen = new Set<string>();
  for (const c of contestants) {
    let base = c.id;
    let n = 1;
    while (seen.has(c.id)) {
      n += 1;
      c.id = `${base}-${n}`;
    }
    seen.add(c.id);
  }

  await setSeason({
    id: seasonId,
    name: seasonName || `Survivor ${seasonId}`, // ✅ provide required name
    lockAt: lockAt.toISOString(),
    contestants,
    actualBootOrder: [],
  });
}

async function actionAddBoot(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId") || "").trim();
  const contestantId = String(formData.get("contestantId") || "").trim();
  if (!seasonId || !contestantId) return;
  await appendBoot(seasonId, contestantId);
}

async function actionRescore(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId") || "").trim();
  if (!seasonId) return;
  await recomputeLeaderboard(seasonId);
}

/* ---------------- page ---------------- */
export default async function SurvivorAdminPage() {
  const currentSeasonId = "S47"; // adjust later if you use a route param
  const season = await getSeason(currentSeasonId);

  return (
    <main className="container max-w-4xl py-10 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Survivor — Admin</h1>
        <p className="text-white/70">Seed the season and manage weekly results.</p>
      </header>

      {/* Status */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2">
        <div className="font-semibold">Season status</div>
        {!season ? (
          <p className="text-sm text-white/70">No season found in KV.</p>
        ) : (
          <div className="text-sm text-white/80 space-y-1">
            <div>
              ID: <span className="font-mono">{season.id}</span>
            </div>
            {"name" in season && (
              <div>
                Name: <span className="font-semibold">{(season as any).name}</span>
              </div>
            )}
            <div>Lock at: {new Date(season.lockAt).toLocaleString()}</div>
            <div>Contestants: {season.contestants.length}</div>
            <div>Recorded boots: {season.actualBootOrder?.length ?? 0}</div>
          </div>
        )}
      </section>

      {/* Seed season */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Seed (or replace) season</h2>
        <form action={actionSeedSeason} className="grid gap-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Season ID</span>
              <input
                name="seasonId"
                defaultValue={currentSeasonId}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-white/80">Season name</span>
              <input
                name="seasonName"
                placeholder={`Survivor ${currentSeasonId}`}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Lock time (local)</span>
            <input
              type="datetime-local"
              name="lockAt"
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Contestants (one per line, optional “| custom-id”)</span>
            <textarea
              name="contestants"
              rows={10}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2 font-mono text-xs"
              placeholder={`Mariah | mariah
Ben
Kira`}
            />
          </label>

          <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 w-fit">
            Save Season
          </button>
        </form>
      </section>

      {/* Weekly results */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Record weekly boot</h2>
        <form action={actionAddBoot} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Season ID</span>
            <input
              name="seasonId"
              defaultValue={currentSeasonId}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Contestant ID</span>
            <input
              name="contestantId"
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              placeholder="mariah"
            />
          </label>
          <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
            Append &amp; Re-score
          </button>
        </form>

        <form action={actionRescore}>
          <input type="hidden" name="seasonId" value={currentSeasonId} />
          <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
            Recompute Leaderboard
          </button>
        </form>

        {season && (
          <div className="text-xs text-white/60">
            Contestant IDs:
            <div className="mt-2 grid sm:grid-cols-2 gap-x-8 gap-y-1">
              {season.contestants.map((c) => (
                <div key={c.id} className="font-mono">
                  {c.id} — <span className="text-white/80">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
