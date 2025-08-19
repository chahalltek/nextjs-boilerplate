// components/Header.jsx
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
  const listenRef = useRef(null);

  const isActive = (href) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  // Close the listen popover when route changes
  useEffect(() => {
    setListenOpen(false);
  }, [pathname]);

  // Close listen popover if user clicks outside it
  useEffect(() => {
    function onDocClick(e) {
      if (!listenRef.current) return;
      if (!listenRef.current.contains(e.target)) setListenOpen(false);
    }
    if (listenOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [listenOpen]);

  return (
    <header className="sticky top-0 z-50 bg-[#120F1E]/80 backdrop-blur supports-[backdrop-filter]:bg-[#120F1E]/60 border-b border-white/10">
      <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white font-semibold whitespace-nowrap shrink-0"
        >
          <Logo size={28} />
          <span className="hidden sm:inline">Hey&nbsp;Skol&nbsp;Sister</span>
        </Link>

        {/* Desktop nav */}
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
          {/* Listen popover */}
          <div
            ref={listenRef}
            className="relative"
            onMouseLeave={() => setListenOpen(false)}
          >
            <button
              type="button"
              className="inline-flex items-center rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:text-white"
              aria-haspopup="dialog"
              aria-expanded={listenOpen}
              aria-controls="listen-popover"
              onClick={() => setListenOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setListenOpen(false);
              }}
            >
              Listen
            </button>

            {listenOpen && (
              <div
                id="listen-popover"
                role="dialog"
                tabIndex={-1}
                className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#120F1E]/95 p-3 text-sm text-white/80 shadow-lg"
              >
                Podcast coming in 2026.
              </div>
            )}
          </div>

          {/* Admin link (always visible; protected by middleware) */}
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white/80 hover:text-white"
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
            onClick={() => {
              setMenuOpen((v) => !v);
              setListenOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#120F1E]/95">
          <div className="container mx-auto max-w-6xl px-4 py-3 grid gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={`py-1 ${isActive(item.href) ? "text-white" : "text-white/80"}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Listen inline note */}
            <button
              type="button"
              className="mt-2 inline-flex w-fit items-center rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white/80 hover:text-white"
              onClick={() => setListenOpen((v) => !v)}
            >
              Listen
            </button>
            {listenOpen && <div className="text-sm text-white/70">Podcast coming in 2026.</div>}

            {/* Admin link on mobile */}
            <Link
              href="/admin"
              className="mt-2 inline-flex w-fit items-center rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white/80 hover:text-white"
              onClick={() => setMenuOpen(false)}
              title="Super Admin"
            >
              Admin
            </Link>

            <Link
              href="/subscribe"
              className="mt-2 inline-flex w-fit items-center rounded-xl px-3 py-1.5 text-sm font-semibold bg-[color:var(--skol-gold)] text-white"
              onClick={() => setMenuOpen(false)}
            >
              Subscribe
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
