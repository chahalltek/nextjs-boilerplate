import Link from "next/link";
import Image from "next/image";

export default function NewsletterCta() {
  return (
    <section className="container">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#2a3e74]/40 via-[#3b3a7b]/30 to-[#5a2a86]/40 p-4 sm:p-5 md:p-6">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-start">
          {/* Copy */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Get the weekly rundown</h3>
            <p className="text-sm text-white/80">
              Fresh tools, lineup notes, and Survivor updates—no spam, ever.
            </p>
            <Link
              href="/subscribe"
              className="inline-flex items-center rounded-lg bg-[color:var(--skol-gold)] px-3 py-1.5 font-semibold text-white hover:opacity-90"
            >
              Subscribe
            </Link>
          </div>

          {/* Image (smaller / capped) */}
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 h-44 sm:h-52 md:h-56">
            <Image
              src="/images/home/envelope-flatlay.jpg"
              alt="Minimal paper envelope on neutral background."
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
