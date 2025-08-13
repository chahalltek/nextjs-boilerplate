import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "The Skol Sisters",
  description: "Smart, sisterly fantasy football advice—with Skol spirit.",
  metadataBase: new URL("https://www.theskolsisters.com"),
  alternates: { canonical: "/" },
  openGraph: { images: ["/og/default-og.png"] },
  twitter: {
    card: "summary_large_image",
    site: "@SkolSisters",
    images: ["/og/default-og.png"],
    title: "The Skol Sisters",
    description: "Smart, sisterly fantasy football advice—with Skol spirit.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="container py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
