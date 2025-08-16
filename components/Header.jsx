'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";

const nav = [
   // { href: "/episodes", label: "Episodes" }, //
  { href: "/start-sit", label: "Start/Sit" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/101", label: "101", title: "Fantasy Football 101" },
  { href: "/cws", label: "Weekly Recap", title: "Coulda, Woulda, Shoulda" },
  { href: "/survivor", label: "Survivor" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-50 bg-[#120F1E]/80 backdrop-blur supports-[backdrop-filter]:bg-[#120F1E]/60 border-b border-white/10">
      <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-white font-semibold">
          <Logo size={28} />
          <span className="hidden sm:inline">The Skol Sisters</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 ml-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              className={`text-sm transition-colors ${
                isActive(item.href) ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/subscribe"
            className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold bg-[color:var(--skol-gold)] text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--skol-gold)]"
          >
            Subscribe
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-white/80 hover:text-white border border-white/20"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#120F1E]/95">
          <div className="container mx-auto max-w-6xl px-4 py-3 grid gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={`py-1 ${isActive(item.href) ? "text-white" : "text-white/80"}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="mt-2 inline-flex w-fit items-center rounded-xl px-3 py-1.5 text-sm font-semibold bg-[color:var(--skol-gold)] text-black"
              onClick={() => setOpen(false)}
            >
              Subscribe
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
