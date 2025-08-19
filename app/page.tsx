// app/page.tsx
export const dynamic = "error"; // build-time render

import Link from "next/link";
import Logo from "@/components/Logo";
import { getAllPosts } from "@/lib/posts";
import TrendingTicker from "@/components/TrendingTicker";

export default function HomePage() {
  const posts =
    (() => {
      try {
        return getAllPosts().slice(0, 3);
      } catch {
        return [];
      }
    })() || [];

  return (
    <div className="space-y-16">
      <div className="space-y-2">
        <p className="text-center text-sm text-white/60">Trending (hot) players</p>
        <TrendingTicker />
      </div>

      {/* HERO */}
      <section className="pt-10 pb-16 text-center relative">
        <div className="absolute inset-0 -z-10 pointer-events-none [mask-image:radial-gradient(50%_50%_at_50%_0%,#000_0%,transparent_70%)]">
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[color:var(--skol-purple)]/30 to-transparent blur-3xl"></div>
        </div>

        <div className="container">
          <div className="mx-auto flex items-center justify-center gap-3">
            <Logo size={180} />
          </div>

          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
            Hey Skol Sister
          </h1>

          <p className="mt-4 text-white/80 max-w-2xl mx-auto text-lg">
            Nobody cares about your fantasy team — except us!!
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/start-sit"
              className="px-4 py-2 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:opacity-90"
            >
              Get this week’s sit/starts
            </Link>
            <Link
              href="/subscribe"
              className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
            >
              Subscribe
            </Link>
          </div>

          <p className="mt-3 text-sm text-white/60">
            Weekly picks, waiver targets, and Survivor takes.
          </p>

          <p className="mt-2 text-xs text-white/60">
            New:{" "}
            <Link href="/roster" className="underline hover:no-underline">
              Skol Coach
            </Link>{" "}
            — save your roster and get weekly start/sit emails.
          </p>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="container grid md:grid-cols-3 gap-4">
        <Feature
          title="Actionable Picks"
          desc="Tiered Start/Sit with confidence levels you can use on Sunday morning."
        />
        <Feature
          title="Waiver + Trades"
          desc="Spot contingent value and stash upside before your league-mates."
        />
        <Feature title="Vikings Vibes" desc="Data-driven—but with plenty of purple. Skol!" />
      </section>

      {/* PROMO GRID: Survivor + Skol Coach */}
      <section className="container grid md:grid-cols-2 gap-4">
        {/* Survivor */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Survivor Bracket Challenge</div>
            <div className="text-sm text-white/70">Make your picks before the lock!</div>
          </div>
          <Link
            href="/survivor"
            className="px-4 py-2 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:opacity-90 whitespace-nowrap"
          >
            Play Now
          </Link>
        </div>

        {/* Skol Coach */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6 flex items-center justify-between gap-4">
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="font-semibold">Skol Coach — Lineup Lab</div>
              {/* NEW badge */}
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border bg-[color:var(--skol-gold)]/15 border-[color:var(--skol-gold)]/40 text-[color:var(--skol-gold)]">
                ✨ New
              </span>
            </div>
            <div className="text-sm text-white/70">
              Save your roster, pin FLEX, and get weekly start/sit emails.
            </div>
          </div>
          <Link
            href="/roster"
            className="px-4 py-2 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:opacity-90 whitespace-nowrap"
          >
            Try Skol Coach
          </Link>
        </div>
      </section>

      {/* LATEST BLOG */}
      <section className="container">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest from the blog</h2>
          <Link href="/blog" className="text-sm text-white/70 hover:opacity-80">
            All posts →
          </Link>
        </div>

        <div className="mt-5 grid md:grid-cols-3 gap-5">
          {posts.length === 0 && <EmptyCard />}
          {posts.map((p: any) => (
            <article
              key={p.slug}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition"
            >
              <h3 className="font-semibold">
                <Link href={`/blog/${p.slug}`} className="hover:underline">
                  {p.title}
                </Link>
              </h3>
              {p.date && (
                <p className="text-white/60 text-xs mt-1">
                  {new Date(p.date).toLocaleDateString()}
                </p>
              )}
              {p.excerpt && <p className="text-white/80 text-sm mt-3">{p.excerpt}</p>}
              <Link
                href={`/blog/${p.slug}`}
                className="inline-block mt-4 text-sm border border-white/20 rounded px-3 py-2"
              >
                Read
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="container my-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[color:var(--skol-purple)]/30 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Never miss a pick</h3>
            <p className="text-white/80 text-sm mt-1">
              Join the newsletter—one email a week during the season.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Link
              href="/subscribe"
              className="px-4 py-3 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:opacity-90 w-full md:w-auto text-center"
            >
              Subscribe free
            </Link>
            <Link
              href="/about"
              className="px-4 py-3 rounded border border-white/20 hover:bg-white/10 w-full md:w-auto text-center"
            >
              About us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-white/80 text-sm mt-2">{desc}</p>
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-sm text-white/70">
      No posts yet. Create your first post in{" "}
      <code className="px-1 py-0.5 rounded bg-black/40 border border-white/10">
        /content/posts
      </code>{" "}
      or via the admin.
    </div>
  );
}
