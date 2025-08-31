"use client";

import Image from "next/image";
import Link from "next/link";

export default function NewsletterCta() {
  return (
    <section
      aria-label="Newsletter"
      className="relative my-12 rounded-2xl border border-white/10 overflow-hidden"
    >
      {/* background */}
      <Image
        src="/images/home/purple-gradient.jpg"
        alt="" // decorative
        fill
        sizes="100vw"
        className="object-cover opacity-40"
        priority={false}
      />

      <div className="relative grid gap-6 p-6 sm:p-10 sm:grid-cols-[1.2fr,1fr] items-center">
        <div>
          <h2 className="text-xl font-semibold">Get the weekly rundown</h2>
          <p className="text-white/80 text-sm mt-1">
            Fresh tools, lineup notes, and survivor updates—no spam, ever.
          </p>
          <Link href="/subscribe" className="btn-gold mt-4 inline-flex">
            Subscribe
          </Link>
        </div>

        <div className="relative w-full aspect-[3/2] sm:aspect-[5/3] rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <Image
            src="/images/home/envelope-flatlay.jpg"
            alt="Minimal paper envelope on neutral background."
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
