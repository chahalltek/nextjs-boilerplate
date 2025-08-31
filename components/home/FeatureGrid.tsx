"use client";

import Image from "next/image";
import Link from "next/link";

export default function FeatureGrid() {
  return (
    <section className="container my-10 space-y-6">
      <h2 className="text-xl font-semibold">What we’re building</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Fans / Community */}
        <figure className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <div className="relative w-full aspect-[4/3]">
            <Image
              src="/images/home/fans-bar.jpg"
              alt="Friends cheering a football play at a bar."
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              priority
            />
          </div>
          <figcaption className="p-2 text-[11px] text-white/50">Photo via Unsplash</figcaption>
        </figure>

        {/* Lineup Lab */}
        <Link href="/roster" className="group rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <div className="relative w-full aspect-[3/2] sm:aspect-[4/3]">
            <Image
              src="/images/home/laptop-dashboard.jpg"
              alt="Laptop showing analytics dashboard in dark mode."
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform group-hover:scale-[1.02]"
            />
          </div>
          <div className="p-3">
            <div className="font-medium">Lineup Lab</div>
            <p className="text-sm text-white/70">Projections, injuries & matchup context—get your weekly start/sit.</p>
          </div>
        </Link>

        {/* Bracket / Strategy */}
        <Link href="/survivor" className="group rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <div className="relative w-full aspect-[3/2]">
            <Image
              src="/images/home/whiteboard-plan.jpg"
              alt="Hand drawing lines and notes on a whiteboard."
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover object-[center_40%] transition-transform group-hover:scale-[1.02]"
            />
          </div>
          <div className="p-3">
            <div className="font-medium">Survivor Bracket</div>
            <p className="text-sm text-white/70">Predict the full boot order and the Final 3—score updates weekly.</p>
          </div>
        </Link>

        {/* Podcast / Audio */}
        <figure className="rounded-xl overflow-hidden border border-white/10 bg-white/5 lg:col-span-2">
          <div className="relative w-full aspect-[16/9]">
            <Image
              src="/images/home/podcast-mic.jpg"
              alt="Podcast microphone with soft studio lights."
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
          <figcaption className="p-2 text-[11px] text-white/50">Photo via Unsplash</figcaption>
        </figure>
      </div>
    </section>
  );
}
