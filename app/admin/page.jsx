// app/admin/page.jsx
import Link from "next/link";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Server Actions ----------------------------------------------------
async function actionRevalidate(formData) {
  "use server";
  const path = formData.get("path");
  const tag = formData.get("tag");

  try {
    if (tag && String(tag).trim()) {
      revalidateTag(String(tag).trim());
      return;
    }
    if (path && String(path).trim()) {
      revalidatePath(String(path).trim());
      return;
    }
  } catch (e) {
    console.error("Revalidate error:", e);
  }
}

async function actionRebuildSearchIndex() {
  "use server";
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/search-index?rebuild=1`, {
      method: "POST",
      cache: "no-store",
    });
    if (!res.ok) console.error("Rebuild search index failed", await res.text());
  } catch (e) {
    console.error("Rebuild search index error:", e);
  }
}

async function actionWarmCaches() {
  "use server";
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const endpoints = [
      "/", "/episodes", "/blog",
      "/podcast.xml", "/rss.xml", "/blog/rss.xml", "/cws/rss.xml", "/holdem-foldem/rss.xml",
    ];
    await Promise.allSettled(
      endpoints.map((p) => fetch(`${base}${p}`, { cache: "no-store" }))
    );
  } catch (e) {
    console.error("Warm caches error:", e);
  }
}

// --- UI ----------------------------------------------------------------
const cards = [
  { href: "/admin/posts", title: "Blog", desc: "Write posts and upload images. Commits to content/posts/…", emoji: "📝" },
  { href: "/admin/cws", title: "Weekly Recap", desc: "Post your ‘Coulda, Woulda, Shoulda’ recap.", emoji: "⏪" },
  { href: "/admin/holdem-foldem", title: "Hold ’em / Fold ’em", desc: "Stash-or-trash: injuries, usage, matchups.", emoji: "🃏" },
  // Start/Sit admin
  { href: "/admin/start-sit", title: "Start / Sit", desc: "Post this week’s Start/Sit thread and notes.", emoji: "✅" },
  // ✅ Newsletter admin (new)
  { href: "/admin/newsletter", title: "Newsletter", desc: "Assemble, edit, schedule & send weekly emails.", emoji: "📧" },
  { href: "/admin/polls", title: "Survivor (Polls)", desc: "Create/manage polls shown on the Survivor page.", emoji: "📊" },
  // Bracket admin
  { href: "/admin/survivor", title: "Survivor — Admin", desc: "Seed season, set lock, record weekly boots, rescore.", emoji: "🏝️" },
  // ✅ Lineup Lab admin hub
  { href: "/admin/lineup-lab", title: "Lineup Lab", desc: "Rosters, overrides, and recompute controls.", emoji: "🧪" },
   // ✅ Analytics admin hub
  { href: "/admin/analytics", title: "Analytics", desc: "Visitors, pageviews, bounce rate and avg visit.", emoji: "" },
];

export default function AdminHome() {
  return (
    <main className="container max-w-5xl py-10 space-y-10">
      <header>
        <h1 className="text-3xl font-bold mb-2">Super Admin</h1>
        <p className="text-white/70">
          Quick controls for cache revalidation and maintenance. Protected by your admin middleware.
        </p>
      </header>

      {/* Revalidation Shortcuts */}
      <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Revalidate (cache) - Charlie Only</h2>

        <form action={actionRevalidate} className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10" name="path" value="/">Revalidate Home</button>
          <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10" name="path" value="/episodes">Revalidate /episodes</button>
          <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10" name="path" value="/blog">Revalidate /blog</button>
        </form>

        <form action={actionRevalidate} className="grid gap-2">
          <label className="text-sm text-white/80">Revalidate specific path</label>
          <div className="flex gap-2">
            <input name="path" placeholder="/episodes/some-slug" className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Revalidate</button>
          </div>
        </form>

        <form action={actionRevalidate} className="grid gap-2">
          <label className="text-sm text-white/80">Revalidate by tag</label>
          <div className="flex gap-2">
            <input name="tag" placeholder="content" className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Revalidate Tag</button>
          </div>
        </form>
      </section>

      {/* Maintenance */}
      <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Maintenance - Charlie Only</h2>
        <div className="flex flex-wrap gap-2">
          <form action={actionRebuildSearchIndex}>
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Rebuild Search Index</button>
          </form>
          <form action={actionWarmCaches}>
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Warm Caches (home, lists, RSS)</button>
          </form>
        </div>
        <p className="text-sm text-white/60">
          Tip: set <code>NEXT_PUBLIC_SITE_URL</code> so server actions can self-call absolute URLs in production.
        </p>
      </section>

      {/* Content tools */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Content Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
            >
              <div className="text-2xl mb-2">{c.emoji}</div>
              <div className="text-lg font-semibold">{c.title}</div>
              <p className="text-sm text-white/70 mt-1">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
