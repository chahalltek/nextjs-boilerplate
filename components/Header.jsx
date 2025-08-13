import Link from "next/link";
import logo from "@/public/brand/logo-horizontal.svg";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
      <div className="container py-3 flex items-center justify-between gap-3">
       <Link href="/" className="flex items-center gap-2">
+    {/* Next/Image is fine for SVG (it won’t optimize it), <img> also works */}
+    <img src={logo.src || logo} alt="The Skol Sisters" className="h-7 w-auto" />
+    <span className="font-extrabold tracking-tight text-lg">The Skol Sisters</span>
+  </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/episodes" className="hover:opacity-80">Episodes</Link>
          <Link href="/start-sit" className="hover:opacity-80">Start/Sit</Link>
          <Link href="/blog" className="hover:opacity-80">Blog</Link>
          <Link href="/cws" className="hover:opacity-80" title="Coulda, Woulda, Shoulda">CWS</Link>
          <Link href="/survivor" className="hover:opacity-80">Survivor</Link>
          <Link href="/about" className="hover:opacity-80">About</Link>
        </nav>

        <Link
          href="/subscribe"
          className="px-3 py-2 rounded bg-[color:var(--skol-gold)] text-black font-semibold hover:opacity-90 text-sm"
        >
          Subscribe
        </Link>
      </div>
    </header>
  );
}
