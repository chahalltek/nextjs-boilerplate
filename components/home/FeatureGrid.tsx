import Link from "next/link";
import Image from "next/image";

function CardShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden " +
        className
      }
    >
      {children}
    </div>
  );
}

export default function FeatureGrid() {
  return (
    <section className="container space-y-3">
      <h2 className="text-lg font-semibold">What we’re building</h2>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Fans / Community — now includes copy + CTA */}
        <CardShell>
          <div className="relative h-40 md:h-44">
            <Image
              src="/images/home/fans-bar.jpg"
              alt="Friends cheering a football play at a bar."
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
          <div className="p-3">
            <div className="font-semibold">Fans &amp; Community</div>
            <p className="text-sm text-white/70">
              Watch-party vibes, weekly takes, and behind-the-scenes notes.
            </p>
            <Link
              href="/blog"
              className="mt-2 inline-block text-sm rounded border border-white/20 px-2 py-1 hover:bg-white/10"
            >
              Read the blog →
            </Link>
          </div>
        </CardShell>

        {/* Lineup Lab */}
        <CardShell>
          <div className="relative h-40 md:h-44">
            <Image
              src="/images/home/dark-dashboard.jpg"
              alt="Laptop showing analytics dashboard in dark mode."
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="p-3">
            <div className="font-semibold">Lineup Lab</div>
            <p className="text-sm text-white/70">
              Projections, injuries &amp; matchup context—get weekly start/sit.
            </p>
            <Link
              href="/roster"
              className="mt-2 inline-block text-sm rounded border border-white/20 px-2 py-1 hover:bg-white/10"
            >
              Try it →
            </Link>
          </div>
        </CardShell>

        {/* Survivor Bracket */}
        <CardShell>
          <div className="relative h-40 md:h-44">
            <Image
              src="/images/home/whiteboard.jpg"
              alt="Hand drawing lines and notes on a whiteboard."
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="p-3">
            <div className="font-semibold">Survivor Bracket</div>
            <p className="text-sm text-white/70">
              Predict the full boot order and the Final 3—scores update weekly.
            </p>
            <Link
              href="/survivor"
              className="mt-2 inline-block text-sm rounded border border-white/20 px-2 py-1 hover:bg-white/10"
            >
              Play now →
            </Link>
          </div>
        </CardShell>
      </div>

      {/* Podcast row — smaller */}
      <div className="grid">
        <CardShell>
          <div className="relative h-52 md:h-56">
            <Image
              src="/images/home/podcast-mic.jpg"
              alt="Podcast microphone with soft studio lights."
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
          <div className="p-3 md:p-4">
            <div className="font-semibold">Podcast (coming soon)</div>
            <p className="text-sm text-white/70">
              Quick hits, matchup talk, and Survivor chatter—bite-size and weekly.
            </p>
          </div>
        </CardShell>
      </div>
    </section>
  );
}
