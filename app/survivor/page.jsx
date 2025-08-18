// app/admin/survivor/page.tsx
import { getSeason, setSeason, appendBoot, recomputeLeaderboard } from "@/lib/survivor/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

async function actionSeed(formData: FormData) {
  "use server";
  const id = String(formData.get("seasonId") || "").trim();
  const lockAtRaw = String(formData.get("lockAt") || "").trim(); // from <input type="datetime-local">
  const namesRaw = String(formData.get("contestants") || "").trim();

  if (!id) throw new Error("Missing season id");
  if (!lockAtRaw) throw new Error("Missing lock time");
  if (!namesRaw) throw new Error("Missing contestants");

  const lockAt = new Date(lockAtRaw);
  const contestants = namesRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // allow "Name | custom-id"
      const [name, custom] = line.split("|").map((v) => v.trim());
      return { id: custom || slugify(name), name };
    });

  // Ensure unique ids
  const seen = new Set<string>();
  for (const c of contestants) {
    if (seen.has(c.id)) {
      c.id = `${c.id}-${Math.random().toString(36).slice(2, 6)}`;
    }
    seen.add(c.id);
  }

  const season = {
    id,
    lockAt: lockAt.toISOString(),
    contestants,
    actualBootOrder: [] as string[],
  };

  await setSeason(season);
}

async function actionAppendBoot(formData: FormData) {
  "use server";
  const sid = String(formData.get("seasonId") || "");
  const cid = String(formData.get("contestantId") || "");
  if (!sid || !cid) throw new Error("Season and contestant are required");
  await appendBoot(sid, cid);
}

async function actionRecompute(formData: FormData) {
  "use server";
  const sid = String(formData.get("seasonId") || "");
  if (!sid) throw new Error("Season is required");
  await recomputeLeaderboard(sid);
}

export default async function SurvivorAdmin() {
  const currentSeasonId = "S47"; // change if needed
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
            <div>ID: <span className="font-mono">{season.id}</span></div>
            <div>Lock at: {new Date(season.lockAt).toLocaleString()}</div>
            <div>Contestants: {season.contestants.length}</div>
            {!!season.actualBootOrder?.length && (
              <div>Recorded boots: {season.actualBootOrder.length}</div>
            )}
          </div>
        )}
      </section>

      {/* Seed / Replace season */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Seed (or replace) season</h2>
        <form action={actionSeed} className="grid gap-
