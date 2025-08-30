// app/admin/survivor/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setSeason, appendBoot, recomputeLeaderboard } from "@/lib/survivor/store";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

export async function seedSeason(formData: FormData) {
  const seasonId = String(formData.get("seasonId") || "").trim().toUpperCase();
  const seasonName = String(formData.get("seasonName") || "").trim();
  const lockAtLocal = String(formData.get("lockAt") || "").trim();
  const contestantsRaw = String(formData.get("contestants") || "").trim();
  if (!seasonId || !lockAtLocal || !contestantsRaw) return;

  const contestants = contestantsRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, custom] = line.split("|").map((v) => v.trim());
      return { id: (custom || slugify(name || "")).toLowerCase(), name: name || "" };
    });

  // ensure unique ids
  const seen = new Set<string>();
  for (const c of contestants) {
    let base = c.id || "player";
    let n = 1;
    while (seen.has(c.id)) c.id = `${base}-${++n}`;
    seen.add(c.id);
  }

  await setSeason({
    id: seasonId,
    name: seasonName || `Survivor ${seasonId}`,
    lockAt: new Date(lockAtLocal).toISOString(),
    contestants,
    actualBootOrder: [],
  });

  revalidatePath("/admin/survivor");
  redirect(`/admin/survivor?season=${encodeURIComponent(seasonId)}`);
}

export async function addBoot(formData: FormData) {
  const seasonId = String(formData.get("seasonId") || "").trim().toUpperCase();
  const contestantId = String(formData.get("contestantId") || "").trim();
  if (!seasonId || !contestantId) return;
  await appendBoot(seasonId, contestantId);
  revalidatePath("/admin/survivor");
}

export async function rescore(formData: FormData) {
  const seasonId = String(formData.get("seasonId") || "").trim().toUpperCase();
  if (!seasonId) return;
  await recomputeLeaderboard(seasonId);
  revalidatePath("/admin/survivor");
}
