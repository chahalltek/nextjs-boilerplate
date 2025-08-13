// app/survivor/page.jsx
import Link from "next/link";
import Poll from "@/components/Poll";
import { getOpenPoll } from "@/lib/polls";
import HyvorComments from "@/components/HyvorComments";

export const metadata = { title: "Survivor — Skol Sisters" };

export default function SurvivorPage() {
  const poll = getOpenPoll(); // expects { slug, question, ... }

  return (
    <div className="container py-12 grid gap-10">
      {/* Fun intro */}
      <section className="grid gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Survivor Superfans Corner</h1>
        <p className="text-white/80 max-w-2xl">
          Welcome to the outwit, outplay, out-type zone. This is where blindside predictions,
          idol conspiracies, and hot takes get voted on faster than Jeff can say “grab your torches.”
        </p>
        <p className="text-white/70 max-w-2xl">
          Think you can spot the purple edit? Convinced a Knowledge is Power shenanigan is coming?
          Call your shot below and let the tribe decide.
        </p>
      </section>

      {/* Poll */}
      <section className="grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          Weekly Tribal Poll
          <span className="text-xs px-2 py-0.5 rounded bg-[color:var(--skol-gold)]/20 border border-[color:var(--skol-gold)]/40 text-[color:var(--skol-gold)]">
            Vote & see results
          </span>
        </h2>
        {poll ? (
          <Poll poll={poll} />
        ) : (
          <div className="text-white/70">
            No active poll right now. Check back after the next episode — or{" "}
            <Link href="/admin" className="underline hover:no-underline">create one in Admin</Link>.
          </div>
        )}
      </section>

      {/* Confessional copy */}
      <section className="prose prose-invert max-w-none">
        <h2>Confessional Booth</h2>
        <p>
          Got a theory about a super-idol? Still salty about a rock draw? Think someone’s about to
          get bamboozled by a fake advantage named “Definitely Not a Napkin”? Drop your confessional
          below. Friendly debate encouraged. Fire-making practice optional.
        </p>
      </section>

      {/* Comments per poll */}
      {poll && (
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <HyvorComments
            pageId={`survivor-${poll.slug}`}
            title={`Survivor Poll: ${poll.question}`}
          />
        </section>
      )}

      {/* CTA card */}
      <section className="grid gap-6">
        <Link
          href="/101"
          className="group rounded-2xl border border-white/15 bg-gradient-to-br from-[color:var(--skol-purple)]/40 to-[color:var(--skol-purple)]/20 p-6 hover:from-[color:var(--skol-purple)]/50 hover:to-[color:var(--skol-purple)]/30 transition"
        >
          <div className="text-sm uppercase tracking-wider text-white/70">New here?</div>
          <div className="mt-1 text-2xl font-extrabold">Start with 101</div>
          <p className="mt-2 text-white/75 max-w-prose">
            A quick primer so your hot takes don’t get snuffed at Tribal.
          </p>
          <div className="mt-4 inline-flex items-center gap-2">
            <span className="rounded-full px-3 py-1 bg-[color:var(--skol-gold)] text-white text-xs font-semibold">
              Begin
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80 group-hover:opacity-100">
              <path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </Link>
      </section>
    </div>
  );
}
