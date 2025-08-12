// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const mono = Roboto_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Skol Sisters",
  description: "Smart, sisterly fantasy football advice—with Skol spirit.",
  metadataBase: new URL("https://www.theskolsisters.com"),
  alternates: { canonical: "/" },

  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180" }],
  },

  openGraph: {
    title: "The Skol Sisters",
    description:
      "Smart, sisterly fantasy football advice—with Skol spirit.",
    url: "https://www.theskolsisters.com",
    images: ["/og/default-og.png"],
  },

  twitter: {
    card: "summary_large_image",
    site: "@SkolSisters",
    title: "The Skol Sisters",
    description:
      "Smart, sisterly fantasy football advice—with Skol spirit.",
    images: ["/og/twitter-card.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${mono.className}`}>{children}</body>
    </html>
  );
}
