// components/Footer.jsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="container py-10 text-white/70">
      {/* …your existing footer content… */}

      <div className="mt-6 flex items-center gap-3">
        {/* Facebook */}
        <a
          href={process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/theskolsisters"}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on Facebook"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5
                     hover:bg-[color:var(--skol-gold)] hover:text-black hover:border-[color:var(--skol-gold)]
                     transition-colors"
        >
          {/* Facebook icon (inline SVG) */}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 5 3.66 9.15 8.44 9.93v-7.03H7.9v-2.9h2.4V9.41c0-2.37 1.41-3.68 3.57-3.68 1.04 0 2.13.19 2.13.19v2.34h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.9h-2.22V22c4.78-.78 8.44-4.93 8.44-9.93z"/>
          </svg>
        </a>
      </div>

      {/* …rest of your footer… */}
    </footer>
  );
}
