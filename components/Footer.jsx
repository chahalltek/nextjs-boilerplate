// components/SiteFooter.jsx
import Link from "next/link";
import Logo from "./Logo";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  // Condensed footer nav (not a copy of the header mega-nav)
  const primaryLinks = [
    { href: "/start-sit", label: "Start/Sit" },
    { href: "/survivor", label: "Survivor" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About" },
  ];

  const utilityLinks = [
    { href: "/subscribe", label: "Subscribe" },
    { href: "/contact", label: "Contact" },
    { href: "/blog/rss", label: "RSS" },
  ];

  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="container py-8 space-y-6">
        {/* Brand row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-semibold">Hey Skol Sister</span>
          </Link>

          {/* Keep Facebook as-is (unchanged) */}
          <div className="sm:ml-auto">
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
          </div>
        </div>

        {/* Link groups */}
        <div className="grid gap-4 sm:grid-cols-2">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {primaryLinks.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-white/80 hover:text-white text-sm"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Footer utilities" className="flex flex-wrap gap-x-6 gap-y-2 sm:justify-end">
            {utilityLinks.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-white/70 hover:text-white text-sm"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Small print */}
        <div className="text-xs text-white/50 flex flex-col sm:flex-row gap-2 sm:items-center">
          <span>© {year} Hey Skol Sister. All rights reserved.</span>
          <span className="hidden sm:inline">•</span>
          <Link href="#top" className="underline/30 hover:underline">Back to top</Link>
        </div>
      </div>
    </footer>
  );
}
