// app/admin/survivor/page.tsx (or ./actions.ts)
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/util/slugify";            // tiny helper shown below if you don't have one
import { seedSeason } from "@/lib/survivor/store";       // <- your existing persistence fn

type SeedResult = { ok: true; count: number } | { ok: false; error: string };

export async function seedSeasonAction(_prevState: SeedResult | null, formData: FormData): Promise<SeedResult> {
  "use server";

  try {
    const seasonId = String(formData.get("seasonId") || "").trim().toUpperCase();
    const seasonName = String(formData.get("seasonName") || "").trim();
    const lockLocal = String(formData.get("lockLocal") || "").trim();
    const contestantsRaw = String(formData.get("contestants") || "");

    if (!seasonId) return { ok: false, error: "Season ID is required." };
    if (!contestantsRaw.trim()) return { ok: false, error: "Add at least one contestant." };

    // Parse "Name | custom-id" (custom-id optional)
    const contestants = contestantsRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [namePart, idPart] = line.split("|").map((s) => s?.trim()).filter(Boolean) as [string?, string?];
        const name = namePart || "";
        const id = idPart || slugify(name);
        return { id, name };
      });

    // Convert local input to ISO (accepts datetime-local string or free text Date parsable)
    const lockAt = lockLocal ? new Date(lockLocal).toISOString() : undefined;

    // Persist
    await seedSeason({
      id: seasonId,
      name: seasonName || seasonId,
      lockAt,
      contestants,
    });

    // Refresh admin + public survivor pages
    revalidatePath("/admin/survivor");
    revalidatePath("/survivor");   // adjust if your public page differs

    return { ok: true, count: contestants.length };
  } catch (err: any) {
    console.error("seedSeasonAction error:", err);
    return { ok: false, error: err?.message || "Failed to save season." };
  }
}
