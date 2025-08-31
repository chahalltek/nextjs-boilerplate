import matter from "gray-matter";

// These are “best-guess” integrations into your repo. They all degrade gracefully.

async function tryImport<T = any>(path: string): Promise<T | null> {
  try {
    // @ts-ignore
    const mod = await import(/* @vite-ignore */ path);
    return (mod as any) || null;
  } catch {
    return null;
  }
}

/** BLOG — uses your lib/posts helper */
export async function collectBlog(): Promise<string> {
  try {
    const mod = await tryImport("@/lib/posts");
    const posts = (mod?.getAllPosts?.() || []).slice(0, 3);
    if (!posts.length) return "No new blog posts this week.";
    return [
      "### From the blog",
      ...posts.map((p: any) =>
        `- **${p.title}** — ${p.excerpt || ""} (/blog/${p.slug})`
      ),
    ].join("\n");
  } catch {
    return "No blog posts available.";
  }
}

/** WEEKLY RECAP — falls back to GitHub content folders */
export async function collectWeeklyRecap(): Promise<string> {
  // Try a dedicated helper if you have it later (swap this in):
  // const { getLatestRecap } = await import("@/lib/recap");
  try {
    const gh = await tryImport("@/lib/github");
    if (!gh?.listDir || !gh?.getFile) return "No weekly recap found.";
    const pick = await pickLatestMarkdownFrom(gh, ["content/weekly", "content/recap", "content/recaps"]);
    return pick || "No weekly recap found.";
  } catch {
    return "No weekly recap found.";
  }
}

/** START/SIT — same GitHub fallback (edit path list to match your repo) */
export async function collectSitStart(): Promise<string> {
  try {
    const gh = await tryImport("@/lib/github");
    if (!gh?.listDir || !gh?.getFile) return "Start/Sit preview coming soon.";
    const pick = await pickLatestMarkdownFrom(gh, ["content/start-sit", "content/sitstart"]);
    return pick || "Start/Sit preview coming soon.";
  } catch {
    return "Start/Sit preview coming soon.";
  }
}

/** HOLD’EM / FOLD’EM — same GitHub fallback */
export async function collectHoldem(): Promise<string> {
  try {
    const gh = await tryImport("@/lib/github");
    if (!gh?.listDir || !gh?.getFile) return "Hold’em / Fold’em returns this week.";
    const pick = await pickLatestMarkdownFrom(gh, ["content/holdem", "content/holdem-foldem"]);
    return pick || "Hold’em / Fold’em returns this week.";
  } catch {
    return "Hold’em / Fold’em returns this week.";
  }
}

/** SURVIVOR POLLS — stub; wire to your real poll store/API when ready */
export async function collectSurvivorPolls(): Promise<string> {
  // If you later have a poll store:
  // const { getRecentPolls } = await import("@/lib/polls");
  // const polls = await getRecentPolls({ limit: 3 });
  // return toMarkdownPolls(polls);
  return "Survivor Polls: results & spicy takes drop after Episode 1.";
}

/** SURVIVOR LEADERBOARD — tries into your survivor store */
export async function collectSurvivorLeaderboard(): Promise<string> {
  try {
    const store: any = await tryImport("@/lib/survivor/store");
    if (!store) return "Survivor Leaderboard goes live after the premiere.";
    const seasonId =
      process.env.NEXT_PUBLIC_SURVIVOR_SEASON_ID ||
      process.env.SURVIVOR_SEASON_ID ||
      "S49";

    // Prefer an explicit helper if you have one
    if (typeof store.getLeaderboard === "function") {
      const lb = await store.getLeaderboard(seasonId).catch(() => null);
      if (lb?.rows?.length) {
        const top = lb.rows.slice(0, 10);
        return [
          "### Survivor Leaderboard (Top 10)",
          "",
          ...top.map(
            (r: any, i: number) =>
              `${i + 1}. **${r.name || r.user || "Anonymous"}** — ${r.points ?? r.score ?? 0} pts`
          ),
          "",
          "See full board: /survivor/leaderboard",
        ].join("\n");
      }
    }

    // Fallback: show lock/contestants as a teaser
    const season = await store.getSeason(String(seasonId).toUpperCase());
    if (!season) return "Survivor Leaderboard will appear when the season is seeded.";
    return [
      `**Season ${season.id}** locks ${new Date(season.lockAt).toLocaleString()}.`,
      `Contestants: ${season.contestants?.length ?? 0}.`,
      "Full board: /survivor/leaderboard",
    ].join("\n");
  } catch {
    return "Survivor Leaderboard goes live after the premiere.";
  }
}

/* ---------------- helpers ---------------- */

async function pickLatestMarkdownFrom(
  gh: any,
  dirs: string[]
): Promise<string | null> {
  for (const DIR of dirs) {
    try {
      const items = (await gh.listDir(DIR).catch(() => [])) as any[];
      const files = items.filter((it) => it.type === "file" && /\.mdx?$/i.test(it.name));
      if (!files.length) continue;

      // sort newest by file date in frontmatter or filename
      const withContent = [];
      for (const f of files) {
        const file = await gh.getFile(f.path).catch(() => null);
        if (!file?.contentBase64) continue;
        const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
        const parsed = matter(raw);
        const when = parsed.data?.date || parsed.data?.publishAt || f.name;
        withContent.push({ when, raw: parsed.content });
      }
      if (!withContent.length) continue;
      withContent.sort((a, b) => String(b.when).localeCompare(String(a.when)));

      // return the markdown body (will be summarized by AI if not verbatim)
      return withContent[0].raw.trim();
    } catch {
      /* keep trying next dir */
    }
  }
  return null;
}
