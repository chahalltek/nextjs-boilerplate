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
  const [open, setOpen] = useState(false);          // mobile menu
  const [listenOpen, setListenOpen] = useState(false); // popover
  const listenRef = useRef(null);

  const isActive = (href) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  // Close Listen on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!listenRef.current) return;
      if (listenOpen && !listenRef.current.contains(e.target)) {
        setListenOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") setListenOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [listenOpen]);

  // Close Listen on route change
  useEffect(() => {
    setListenOpen(false);
  }, [pathname]);

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
          {/* Listen popover (controlled) */}
          <details
            ref={listenRef}
            open={listenOpen}
            onToggle={(e) => setListenOpen(e.currentTarget.open)}
            className="relative hidden md:block"
          >
            <summary className="cursor-pointer rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:text-white whitespace-nowrap select-none">
              Listen
            </summary>
            {listenOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-[#120F1E]/95 p-4 shadow-lg">
                <p className="text-sm text-white/80">
                  Podcast launching in <strong>2026</strong>. Follow along and{" "}
                  <Link href="/subscribe" className="underline" onClick={() => setListenOpen(false)}>
                    subscribe for updates
                  </Link>
                  .
                </p>
              </div>
            )}
          </details>

          {/* Admin link (subtle) */}
          <Link
            href="/admin"
            className="hidden xl:inline-flex items-center rounded-lg px-2 py-1 text-xs text-white/60 hover:text-white/90 border border-white/10 whitespace-nowrap"
            title="Admin"
          >
            Admin
          </Link>

          {/* Subscribe */}
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

            {/* Listen message for mobile */}
            <div className="mt-2 rounded-xl border border-white/10 p-3 text-sm text-white/80">
              Podcast launching in <strong>2026</strong>.{" "}
              <Link href="/subscribe" className="underline" onClick={() => setOpen(false)}>
                Subscribe for updates
              </Link>
              .
            </div>

            {/* Admin link on mobile */}
            <Link
              href="/admin"
              className="inline-flex w-fit items-center rounded-lg px-2 py-1 text-xs text-white/60 hover:text-white/90 border border-white/10 mt-2"
              onClick={() => setOpen(false)}
              title="Admin"
            >
              Admin
            </Link>

            {/* Subscribe button on mobile */}
            <Link
              href="/subscribe"
              className="mt-2 inline-flex w-fit items-center rounded-xl px-3 py-1.5 text-sm font-semibold bg-[color:var(--skol-gold)] text-white"
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
