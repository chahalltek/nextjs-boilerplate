import { getOpenPoll } from "@/lib/polls";
import Poll from "@/components/Poll";
import HyvorComments from "@/components/HyvorComments";

export const metadata = { title: "Survivor — Skol Sisters" };

export default function SurvivorPage() {
  const poll = getOpenPoll();

  return (
    <div className="container py-12 grid gap-10 max-w-3xl">
      <header className="grid gap-2">
        <h1 className="text-4xl font-extrabold">Survivor</h1>
        <p className="text-white/70">
          Weekly tribal talk for superfans. Vote in the poll and tell us why we’re wrong. 🪵🔥
        </p>
      </header>

      {poll ? (
        <Poll poll={poll} />
      ) : (
        <p className="text-white/60 italic">No active poll right now. Check back after the immunity challenge…</p>
      )}

      <section className="grid gap-3">
        <h3 className="text-2xl font-bold">Comments</h3>
        <HyvorComments pageId={`survivor-${poll ? poll.slug : "no-poll"}`} />
      </section>
    </div>
  );
}
