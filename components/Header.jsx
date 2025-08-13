import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-[color:var(--skol-ink)]/95 backdrop-blur border-b border-white/10">
      <div className="container h-14 flex items-center justify-between gap-6">
        {/* Brand (single instance) */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* use your shield mark; swap src if yours is different */}
          <Image src="/logo-mark.svg" alt="Skol Sisters" width={24} height={24} priority />
          <span className="text-white font-semibold tracking-tight">The Skol Sisters</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <Link href="/episodes">Episodes</Link>
          <Link href="/start-sit">Start/Sit</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/101" title="Coulda, Woulda, Shoulda 101">101</Link>
          <Link href="/cws" title="Coulda, Woulda, Shoulda">CWS</Link>
          <Link href="/survivor">Survivor</Link>
          <Link
            href="/subscribe"
            className="rounded-xl px-3 py-1.5 bg-[color:var(--skol-gold)] text-black font-semibold"
          >
            Subscribe
          </Link>
        </nav>
      </div>
    </header>
  );
}
