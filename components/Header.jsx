// components/Header.jsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
// If you keep your nav config in lib/nav, import it. Otherwise inline your items here.
import { navGroups } from "@/lib/nav"; // [{ key, label, items:[{title, href, desc?}] }]

function useHoverIntent() {
  const [openKey, setOpenKey] = useState(null);
  const timer = useRef(null);

  const open = (key) => {
    if (timer.current) clearTimeout(timer.current);
    setOpenKey(key);
  };
  const closeSoon = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpenKey(null), 150);
  };
  const closeNow = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpenKey(null);
  };
  return { openKey, open, closeSoon, closeNow };
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openKey, open, closeSoon, closeNow } = useHoverIntent();
  const groups = Array.isArray(navGroups) ? navGroups : []; // <- guard

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        closeNow();
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [closeNow]);

  return (
    <header className="sticky top-0 z-50 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50">
      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="font-bold text-white">Hey Skol Sister</Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navGroups.map((g) => (
            <div
              key={g.key}
              className="relative"
              onMouseEnter={() => open(g.key)}
              onMouseLeave={closeSoon}
              onFocus={() => open(g.key)}
              onBlur={closeSoon}
            >
              <button
                className="px-2 py-1 rounded hover:bg-white/10 text-white/90"
                aria-expanded={openKey === g.key}
                aria-haspopup="true"
              >
                {g.label}
              </button>

              {/* Flyout */}
              <div
                className={`absolute left-0 top-full mt-2 transition-opacity ${
                  openKey === g.key ? "opacity-100 visible" : "opacity-0 invisible"
                }`}
                onMouseEnter={() => open(g.key)}
                onMouseLeave={closeSoon}
              >
                {/* Hover bridge to prevent gap-close */}
                <div className="absolute -top-2 left-0 right-0 h-2" aria-hidden />

                <div className="min-w-56 rounded-xl border border-white/10 bg-zinc-900 shadow-xl z-50 p-2">
                  {g.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className="block rounded-lg px-3 py-2 hover:bg-white/10 text-white"
                      onClick={closeNow}
                    >
                      <div className="font-medium">{it.title}</div>
                      {it.desc && (
                        <div className="text-xs text-white/60">{it.desc}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* CTA */}
          <Link
            href="/starter-pack"
            className="rounded-xl border border-white/20 px-3 py-1.5 hover:bg-white/10 text-white"
          >
            Starter Pack
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden px-3 py-2 rounded border border-white/20 text-white"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          Menu
        </button>
      </div>

      {/* Mobile panel */}
      <div className={`md:hidden border-t border-white/10 bg-zinc-950 ${mobileOpen ? "block" : "hidden"}`}>
        <div className="container py-3 space-y-5">
          {navGroups.map((g) => (
            <div key={g.key}>
              <div className="text-xs uppercase text-white/40 mb-1">{g.label}</div>
              <div className="grid">
                {g.items.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="px-2 py-2 rounded hover:bg-white/10 text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {it.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link
            href="/starter-pack"
            className="block text-center rounded-xl border border-white/20 px-3 py-2 hover:bg-white/10 text-white"
            onClick={() => setMobileOpen(false)}
          >
            Starter Pack
          </Link>
        </div>
      </div>
    </header>
  );
}
