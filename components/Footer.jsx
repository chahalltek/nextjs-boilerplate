// components/Footer.jsx
import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
    { href: "/episodes", label: "Episodes" },
    { href: "/start-sit", label: "Start/Sit" },
    { href: "/cws", label: "CWS" },
    { href: "/survivor", label: "Survivor" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="container py-8 grid gap-8 md:grid-cols-[1fr,auto,1fr] items-start">
        {/* Left: brand + copyright */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="font-semibold">The Skol Sisters</span>
          </div>
          <p className="text-xs text-white/50">© {year} The Skol Sisters. All rights reserved.</p>
        </div>

        {/* Middle: nav (centered) */}
        <nav className="justify-center md:justify-center flex flex-wrap gap-x-6 gap-y-2 text-white/80">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right: social(s) */}
        <div className="flex md:justify-end">
          <a
            href="https://www.facebook.com/profile.php?id=61578258645337"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 hover:bg-white/10 transition"
          >
            {/* Facebook icon */}
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true" className="h-5 w-5 fill-white/80">
              <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06C2 17.05 5.66 21.21 10.44 22v-7.03H7.9v-2.91h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.86h2.78l-.44 2.91h-2.34V22C18.34 21.21 22 17.05 22 12.06Z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
