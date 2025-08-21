// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  title: { default: "Hey Skol Sister", template: "%s | Hey Skol Sister" },
  description: "A Minnesota Vikings fan podcast.",
  openGraph: { type: "website", siteName: "Hey Skol Sister" },
  twitter: { card: "summary_large_image", creator: "@SkolSisters" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  const seriesLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: "Hey Skol Sister",
    url: process.env.NEXT_PUBLIC_Site_URL || process.env.NEXT_PUBLIC_SITE_URL, // tolerate typo
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "Hey Skol Sister" },
  };

  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://www.soundhelix.com" crossOrigin="" />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:outline-none">Skip to content</a>

        <Header />

        {/* Let pages decide their own container/max-width */}
        <main id="main" className="py-8">
          {children}
        </main>

        <Footer />

        <Script id="series-jsonld" type="application/ld+json">
          {JSON.stringify(seriesLd)}
        </Script>

        {gaId && (
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

        {plausibleDomain && (
          <Script
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
