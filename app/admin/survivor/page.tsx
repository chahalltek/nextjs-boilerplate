// app/admin/survivor/page.tsx
import { revalidatePath } from "next/cache";
export const dynamic = "force-dynamic";

async function recordBoot(formData: FormData) {
  "use server";
  const seasonId = String(formData.get("seasonId"));
  const bootId = String(formData.get("bootId"));
  // await appendBoot(seasonId, bootId); // update season.actualBootOrder
  // await recomputeScores(seasonId);
  revalidatePath("/survivor/leaderboard");
}

export default async function AdminSurvivor() {
  // const season = await getSeason("S47");
  // const remaining = remainingContestants(season);
  return (
    <main className="container max-w-3xl py-10 space-y-4">
      <h1 className="text-2xl font-bold">Survivor Admin</h1>
      <form action={recordBoot} className="flex gap-2">
        <input type="hidden" name="seasonId" value="S47" />
        {/* <select name="bootId" …>{remaining.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select> */}
        <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Record Boot</button>
      </form>
    </main>
  );
}
