// app/survivor/page.jsx
import Link from "next/link";
import Poll from "@/components/Poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Survivor — Skol Sisters",
  description: "Vote in the weekly poll and see live results.",
};

async function loadPolls() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const res = await fetch(`${base}/api/polls`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return data;
}

export default async function SurvivorPage({ searchParams }) {
  const { ok, polls = [], activeSlug = null, error } = await loadPolls();

  // Pick selected poll: ?slug=, else active, else first
  const selectedSlug =
    searchParams?.slug || activeSlug || (polls[0]?.slug ?? null);
  const selected = polls.find((p) => p.slug === selectedSlug) || null;

  return (
    <div className="container max-w-5xl py-10">
      <h1 className="text-4xl font-bold text-white mb-2">Survivor</h1>
      <p className="text-white/70 mb-8">
        Vote in the weekly poll and see live results.
      </p>

      {!ok && (
        <div className="text-red-400">
          Failed to load polls{error ? `: ${error}` : ""}.
        </div>
      )}

      {ok && polls.length === 0 && (
        <div className="text-white/70">No polls yet.</div>
      )}

      {ok && polls.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: list of polls */}
          <aside className="lg:col-span-1">
            <div className="card p-4">
              <h2 className="text-lg font-semibold mb-3">All polls</h2>
              <ul className="space-y-2">
                {polls.map((p) => {
                  const isActive = p.slug === selectedSlug;
                  return (
                    <li key={p.slug}>
                      <Link
                        href={`/survivor?slug=${encodeURIComponent(p.slug)}`}
                        className={`block rounded px-3 py-2 border transition ${
                          isActive
                            ? "border-white/40 bg-white/10 text-white"
                            : "border-white/10 text-white/80 hover:text-white hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="font-medium">
                          {p.question || p.slug}
                        </div>
                        <div className="text-xs text-white/50">
                          slug: {p.slug}
                          {p.active ? " • active" : ""}
                          {p.closesAt ? ` • closes ${p.closesAt}` : ""}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Right: selected poll */}
          <section className="lg:col-span-2">
            {selected ? (
              <div className="card p-5">
                {/* Poll is a Client Component; we pass plain data only */}
                <Poll poll={selected} />
              </div>
            ) : (
              <div className="card p-5 text-white/70">
                Select a poll from the list.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}