// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

// Use the Geist package (installed) — NOT next/font/google
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: "The Skol Sisters",
  description: "Smart, sisterly fantasy football advice—with Skol spirit.",
  metadataBase: new URL("https://www.theskolsisters.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.className} ${GeistMono.className}`}>
        {children}
      </body>
    </html>
  );
}

