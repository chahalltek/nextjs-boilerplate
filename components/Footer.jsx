// components/SiteFooter.jsx
import Link from "next/link";
import Logo from "./Logo";
import ListenCtas from "./ListenCtas";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const SHOW_LISTEN = process.env.NEXT_PUBLIC_SHOW_LISTEN === "1"; // toggle on later

  // Match header order:
  // Start/Sit → Weekly Recap → Survivor → Hold ’em Fold ’em → Stats → Blog → 101 → About → Search
  const nav = [
    { href: "/start-sit", label: "Start/Sit" },
    { href: "/cws", label: "Weekly\u00A0Recap", title: "Coulda, Woulda, Shoulda" },
    { href: "/survivor", label: "Survivor" },
    { href: "/holdem-foldem", label: "Hold & Fold", title: "Who to stash, who to trash" },
    { href: "/stats", label: "Stats" },
    { href: "/blog", label: "Blog" },
    { href: "/101", label: "101", title: "Fantasy Football 101" },
    { href: "/about", label: "About" },
    { href: "/search", label: "Search" },
  ];

  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="container py-6">
        {/* One row that wraps on small screens */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-semibold">Hey Skol Sister</span>
          </Link>

          {/* Links + Facebook icon together */}
          <nav className="flex items-center gap-6">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                title={n.title}
                className="text-white/80 hover:text-white"
              >
                {n.label}
              </Link>
            ))}
            <a
              href="https://www.facebook.com/profile.php?id=61578258645337"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hey Skol Sister on Facebook"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22 12.07C22 6.48 17.52 2 11.93 2 6.35 2 1.87 6.48 1.87 12.07c0 4.99 3.65 9.13 8.42 9.93v-7.02H7.9V12.1h2.39v-1.9c0-2.35 1.4-3.66 3.54-3.66 1.02 0 2.09.18 2.09.18v2.3h-1.18c-1.16 0-1.52.72-1.52 1.46v1.62h2.59l-.41 2.89h-2.18V22c4.77-.8 8.42-4.94 8.42-9.93z"
                />
              </svg>
            </a>
          </nav>

          {/* Listen CTAs (hidden by default; enable with NEXT_PUBLIC_SHOW_LISTEN=1) */}
          {SHOW_LISTEN ? <ListenCtas /> : null}

          {/* Copyright pushed to the far right on wide screens */}
          <div className="ml-auto text-xs text-white/50">
            © {year} Hey Skol Sister. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
