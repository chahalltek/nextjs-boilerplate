// components/Header.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import ListenCtas from "@/components/ListenCtas";

const nav = [
  { href: "/start-sit", label: "Start/Sit" },
  { href: "/cws", label: "Weekly\u00A0Recap", title: "Coulda, Woulda, Shoulda" },
  { href: "/survivor", label: "Survivor" },
  { href: "/holdem-foldem", label: "Hold\u00A0\u2019em\u00A0Fold\u00A0\u2019em" },
  { href: "/stats", label: "Stats" },
  { href: "/blog", label: "Blog" },
  { href: "/101", label: "101", title: "Fantasy Football 101" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) => pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-50 bg-[#120F1E]/80 backdrop-blur supports-[backdrop-filter]:bg-[#120F1E]/60 border-b border-white/10">
      <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
        {/* BRAND: never wrap */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white font-semibold whitespace-nowrap shrink-0"
        >
          <Logo size={28} />
          <span className="hidden sm:inline">Hey&nbsp;Skol&nbsp;Sister</span>
        </Link>

        {/* Desktop nav: keep on one line */}
        <nav className="hidden md:flex items-center gap-6 ml-4 whitespace-nowrap">
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
          {/* Compact Listen dropdown on md–lg; full pills on xl+ */}
          <details className="relative hidden md:block xl:hidden">
            <summary className="cursor-pointer rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:text-white whitespace-nowrap">
              Listen
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#120F1E]/95 p-3 shadow-lg">
              <ListenCtas className="flex flex-col gap-2" />
            </div>
          </details>
          <div className="hidden xl:flex">
            <ListenCtas />
          </div>

          {/* Admin button (middleware will protect) */}
          <Link
            href="/admin"
            className="hidden md:inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white/80 hover:text-white hover:bg-white/10 whitespace-nowrap"
            title="Super Admin"
          >
            Admin
          </Link>

          <Link
            href="/subscribe"
            className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold bg-[color:var(--skol-gold)] text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--skol-gold)] whitespace-nowrap"
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
              href="/admin"
              className="py-1 text-white/80 hover:text-white"
              onClick={() => setOpen(false)}
              title="Super Admin"
            >
              Admin
            </Link>
            <Link
              href="/subscribe"
              className="mt-2 inline-flex w-fit items-center rounded-xl px-3 py-1.5 text-sm font-semibold bg-[color:var(--skol-gold)] text-white"
              onClick={() => setOpen(false)}
            >
              Subscribe
            </Link>
            <ListenCtas className="mt-4" />
          </div>
        </div>
      )}
    </header>
  );
}
