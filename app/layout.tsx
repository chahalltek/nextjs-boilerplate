// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
// (keep your font imports)
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "The Skol Sisters",
  description: "Smart, sisterly fantasy football advice—with Skol spirit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
