// components/Footer.jsx
import Link from "next/link";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/episodes", label: "Episodes" },
  { href: "/start-sit", label: "Start/Sit" },
  { href: "/cws", label: "CWS" },
  { href: "/survivor", label: "Survivor" },
  { href: "/contact", label: "Contact" },
];

const FACEBOOK_URL =
  process.env.NEXT_PUBLIC_FACEBOOK_URL ||
  "https://www.facebook.com/profile.php?id=61578258645337";

function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 5 3.66 9.15 8.44 9.93v-7.03H7.9v-2.9h2.4V9.41c0-2.37 1.41-3.68 3.57-3.68 1.04 0 2.13.19 2.13.19v2.34h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.9h-2.22V22c4.78-.78 8.44-4.93 8.44-9.93z"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="container py-10 grid gap-6 md:grid-cols-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Logo size={24} />
          <span className="font-semibold">The Skol Sisters</span>
        </div>

        {/* Site links */}
        <nav className="md:justify-self-center">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-white/70">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Socials */}
        <div className="md:justify-self-end flex items-center gap-3">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5
                       hover:bg-[color:var(--color-skol-gold)] hover:text-black hover:border-[color:var(--color-skol-gold)]
                       transition-colors"
          >
            <FacebookIcon />
          </a>
          {/* If you add more socials, append them here */}
        </div>
      </div>

      <div className="container pb-8 text-xs text-white/50">
        © {new Date().getFullYear()} The Skol Sisters. All rights reserved.
      </div>
    </footer>
  );
}
