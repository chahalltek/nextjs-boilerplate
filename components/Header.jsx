// components/Header.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV, CTA } from "@/lib/nav";
import Logo from "@/components/Logo"; // falls back to text if you prefer

function isActive(pathname, href) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  // highlight group when current route starts with the link
  return pathname === href || pathname.startsWith(href + "/");
}

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function DesktopMenu({ pathname }) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV.map((item) =>
        item.items ? (
          <Dropdown key={item.label} label={item.label} pathname={pathname} items={item.items} />
        ) : (
          <TopLink key={item.label} href={item.href} active={isActive(pathname, item.href)}>
            {item.label}
          </TopLink>
        )
      )}
    </nav>
  );
}

function TopLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/5"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function Dropdown({ label, items, pathname }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useOutsideClose(boxRef, () => setOpen(false));

  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  const active = items.some((it) => isActive(pathname, it.href));

  return (
    <div
      ref={boxRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
          active ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/5"
        }`}
        aria-expanded={open}
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
          <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur shadow-lg p-1">
          {items.map((it) => {
            const a = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  a ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => setOpen(false)}
                aria-current={a ? "page" : undefined}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ pathname }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({}); // group label -> bool

  function toggle(label) {
    setExpanded((e) => ({ ...e, [label]: !e[label] }));
  }

  return (
    <>
      <button
        className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M4 7h16v2H4V7Zm0 8h16v2H4v-2Z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[88%] max-w-[380px] bg-zinc-900 border-l border-white/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold">Menu</div>
              <button
                className="p-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {NAV.map((item) =>
                item.items ? (
                  <div key={item.label} className="border border-white/10 rounded-xl">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                      onClick={() => toggle(item.label)}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="opacity-70">{expanded[item.label] ? "−" : "+"}</span>
                    </button>
                    {expanded[item.label] && (
                      <div className="px-2 pb-2">
                        {item.items.map((it) => {
                          const a = isActive(pathname, it.href);
                          return (
                            <Link
                              key={it.href}
                              href={it.href}
                              className={`block px-3 py-2 rounded-lg text-sm ${
                                a ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/5"
                              }`}
                              onClick={() => setOpen(false)}
                              aria-current={a ? "page" : undefined}
                            >
                              {it.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`block px-4 py-3 rounded-xl border border-white/10 ${
                      isActive(pathname, item.href)
                        ? "bg-white/10 text-white"
                        : "text-white/80 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>

            <div className="mt-6">
              <Link
                href={CTA.href}
                className="block text-center w-full px-4 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90"
                onClick={() => setOpen(false)}
              >
                {CTA.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <div className="container max-w-6xl mx-auto flex items-center justify-between h-14 px-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Logo className="h-6 w-auto" />
            <span className="sr-only">Hey Skol Sister</span>
          </Link>
          <DesktopMenu pathname={pathname} />
        </div>

        <div className="flex items-center gap-2">
          {/* Optional search link; point to your search page if you have one */}
          <Link
            href="/search"
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:text-white hover:bg-white/5"
            title="Search"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8L20 21.5 21.5 20 15.5 14Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
            </svg>
          </Link>

          <Link
            href={CTA.href}
            className="hidden md:inline-flex items-center px-3 py-2 rounded-xl bg-white text-black font-semibold hover:bg-white/90"
          >
            {CTA.label}
          </Link>

          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
