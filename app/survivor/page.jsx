// app/survivor/page.jsx
import Link from "next/link";
import Poll from "@/components/Poll";
import Comments from "@/components/Comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Survivor — Skol Sisters",
  description: "Vote in the weekly poll and see live results.",
};

function siteOrigin() {
  // Prefer explicit env when deployed, fall back to Vercel URL, then relative fetch in dev
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  return vercel;
}

async function fetchActivePolls() {
  const origin = siteOrigin();
  const url = (origin ? `${origin}` : "") + `/api/polls?active=1`;
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } }).catch(() => null);
  if (!res || !res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.polls) ? data.polls : [];
}

export default async function SurvivorPage({ searchParams }) {
  const polls = await fetchActivePolls();
  const selectedSlug = searchParams?.slug;
  const selected = polls.find((p) => p.slug === selectedSlug) || polls[0];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold text-white mb-3">Survivor</h1>
      <p className="text-white/70 mb-8">
        Vote in the weekly poll and see live results.
      </p>

      {polls.length === 0 ? (
        <p className="text-white/60">
          No active polls. Mark at least one poll as <em>active</em> in Admin → Polls.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: active polls list */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-xl font-semibold mb-3">All polls</h2>
            <div className="grid gap-3">
              {polls.map((p) => (
                <Link
                  key={p.slug}
                  href={`/survivor?slug=${encodeURIComponent(p.slug)}`}
                  className={`block rounded-xl border p-3 transition-colors ${
                    selected?.slug === p.slug
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white">{p.question}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                      active
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/50">slug: {p.slug}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right: selected poll + comments */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {selected ? (
              <>
                <Poll key={selected.slug} poll={selected} />
                <div className="mt-8">
                  <Comments pageId={`poll:${selected.slug}`} title={selected.question} />
                </div>
              </>
            ) : (
              <div className="text-white/70">Select a poll from the list.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
