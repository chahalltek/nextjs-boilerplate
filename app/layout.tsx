// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

/** normalize a site url; auto-prepend https:// if missing; ensure it's valid */
function normalizeSiteUrl(input?: string, fallback = "https://example.com"): string {
  const raw = (input || "").trim();
  if (!raw) return fallback;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    // Validate and re-serialize
    return new URL(withProto).toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

/** extract hostname for Plausible data-domain */
function hostnameOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

const PUBLIC_SITE_URL =
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_Site_URL, "https://heyskolsister.com");

const PLAUSIBLE_DOMAIN =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || hostnameOf(PUBLIC_SITE_URL);

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: { default: "Hey Skol Sister", template: "%s | Hey Skol Sister" },
  description: "A Minnesota Vikings fan podcast.",
  openGraph: { type: "website", siteName: "Hey Skol Sister", url: PUBLIC_SITE_URL },
  twitter: { card: "summary_large_image", creator: "@SkolSisters" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  const seriesLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: "Hey Skol Sister",
    url: PUBLIC_SITE_URL, // normalized + valid
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "Hey Skol Sister" },
  };

  const isProd = process.env.NODE_ENV === "production";

  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://www.soundhelix.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:outline-none">Skip to content</a>

        <Header />
        <main id="main" className="py-8">{children}</main>
        <Footer />

        {/* Structured data */}
        <Script id="series-jsonld" type="application/ld+json">
          {JSON.stringify(seriesLd)}
        </Script>

        {/* Google Analytics (optional) */}
        {isProd && gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}</Script>
          </>
        )}

        {/* Plausible Analytics (robust; works whether env var present or not) */}
        {isProd && PLAUSIBLE_DOMAIN && (
          <>
            <Script
              id="plausible-core"
              strategy="afterInteractive"
              data-domain={PLAUSIBLE_DOMAIN}
              defer
              src="https://plausible.io/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js"
            />
            <Script id="plausible-queue" strategy="afterInteractive">{`
              window.plausible = window.plausible || function() {
                (window.plausible.q = window.plausible.q || []).push(arguments)
              }
            `}</Script>
          </>
        )}
      </body>
    </html>
  );
}
