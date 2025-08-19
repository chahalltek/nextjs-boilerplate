// components/SiteFooter.jsx
import Link from "next/link";
import Logo from "./Logo";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  // Match header order:
  // Start/Sit → Weekly Recap → Survivor → Hold ’em Fold ’em → Stats → Blog → 101 → About → Search
  const nav = [
    { href: "/start-sit", label: "Start/Sit" },
    { href: "/cws", label: "Weekly\u00A0Recap", title: "Coulda, Woulda, Shoulda" },
    { href: "/survivor", label: "Survivor" },
    { href: "/holdem-foldem", label: "Hold\u00A0\u2019em\u00A0Fold\u00A0\u2019em", title: "Who to stash, who to trash" },
    { href: "/stats", label: "Stats" },
    { href: "/blog", label: "Blog" },
    { href: "/101", label: "101", title: "Fantasy Football 101" },
    { href: "/about", label: "About" },
    { href: "/search", label: "Search" },
  ];

  return (
    // Hidden on mobile, shown from md and up
    <footer className="mt-16 border-t border-white/10 hidden md:block">
      <div className="container py-6">
        {/* One row that wraps on small screens (desktop/tablet only due to md:block) */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-semibold">Hey Skol Sister</span>
          </Link>

          {/* Links + Facebook button */}
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

            {/* Bigger, labeled Facebook link */}
            <a
              href="https://www.facebook.com/profile.php?id=61578258645337"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hey Skol Sister on Facebook"
              title="Facebook"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 px-3 py-1.5"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22 12.07C22 6.48 17.52 2 11.93 2 6.35 2 1.87 6.48 1.87 12.07c0 4.99 3.65 9.13 8.42 9.93v-7.02H7.9V12.1h2.39v-1.9c0-2.35 1.4-3.66 3.54-3.66 1.02 0 2.09.18 2.09.18v2.3h-1.18c-1.16 0-1.52.72-1.52 1.46v1.62h2.59l-.41 2.89h-2.18V22c4.77-.8 8.42-4.94 8.42-9.93z"
                />
              </svg>
              <span className="text-sm">Facebook</span>
            </a>
          </nav>

          {/* Podcast CTAs removed (hidden until launch) */}

          {/* Copyright pushed to the far right on wide screens */}
          <div className="ml-auto text-xs text-white/50">
            © {year} Hey Skol Sister. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
