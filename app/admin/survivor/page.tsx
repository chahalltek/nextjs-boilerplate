// app/admin/survivor/page.tsx (snippet)
import { appendBoot, recomputeLeaderboard, getSeason } from "@/lib/survivor/store";
import { revalidatePath } from "next/cache";

async function recordBoot(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId"));
  const bootId = String(formData.get("bootId"));
  await appendBoot(seasonId, bootId);
  await recomputeLeaderboard(seasonId);
  revalidatePath("/survivor/leaderboard");
}

export default async function AdminSurvivor() {
  const seasonId = "S47";
  const season = await getSeason(seasonId);
  const remaining = season
    ? season.contestants.filter((c) => !season.actualBootOrder.includes(c.id))
    : [];

  return (
    <main className="container max-w-3xl py-10 space-y-4">
      <h1 className="text-2xl font-bold">Survivor Admin</h1>
      <form action={recordBoot} className="flex gap-2">
        <input type="hidden" name="seasonId" value={seasonId} />
        <select name="bootId" className="rounded border border-white/20 bg-transparent px-3 py-2">
          {remaining.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
          Record Boot
        </button>
      </form>
    </main>
  );
}
