import Link from "next/link";
import { getAllEpisodes } from "@/lib/episodes";
import SubscribeCta from "@/components/SubscribeCta";

export const metadata = {
  title: "Episodes — Skol Sisters Podcast",
  description: "Our podcast is almost here. Be gentle—first-time podcasters, lifelong superfans.",
};

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  return (
    <div className="container py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Episodes</h1>
        <p className="mt-2 text-white/70">
          Mic check, 1…2…Skol. 🎙️ We’re setting up gear and warming up takes. Episode 1 is coming soon—
          please be kind; this is our first pod and the dog refuses to sign a non-bark agreement.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="card p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-3">What you’ll hear</h2>
          <ul className="list-disc pl-5 space-y-2 text-white/80">
            <li>Game breakdowns spiked with just the right amount of chaos.</li>
            <li>Start/Sit philosophy you can argue about at brunch.</li>
            <li>Listener questions, bold predictions, and occasional victory confetti.</li>
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
             <SubscribeCta />
            <Link href="/contact" className="cta-card">
              <span className="cta-title">Suggest a topic</span>
              <span className="cta-sub">Hot takes, cold takes, lukewarm takes—send ’em.</span>
            </Link>
          </div>
        </section>

        <aside className="card p-6">
          <h3 className="text-lg font-semibold mb-2">Studio Progress</h3>
          <ul className="space-y-2 text-white/80">
            <li>🎙️ Microphones: arriving any minute.</li>
            <li>🎧 Headphones: borrowed (thanks, neighbor!).</li>
            <li>🧼 Pop filters: unexpectedly life-changing.</li>
            <li>🛠️ Editing skills: levelling up rapidly.</li>
          </ul>
          <p className="mt-4 text-white/60 text-sm">
            If you hear a dog bark in Ep1, no you didn’t.
          </p>
        </aside>
      </div>

      <section className="mt-12">
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-3">Teaser Feed</h3>
           {episodes.length === 0 && (
            <>
              <p className="text-white/70">
                No episodes yet—this is where the player and show notes will live.
              </p>
              <div className="mt-4 aspect-video bg-white/5 border border-white/10 rounded-xl grid place-items-center text-white/40">
                <span>Podcast Player Placeholder</span>
              </div>
            </>
          )}
          {episodes.length > 0 && (
            <ul className="space-y-4">
              {episodes.map((ep) => (
                <li key={ep.id}>
                  <Link href={`/episodes/${ep.slug}`} className="text-lg text-white hover:underline">
                    {ep.title}
                  </Link>
                  <p className="text-white/70">{ep.teaser}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
