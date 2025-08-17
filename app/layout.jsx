import "./../styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Hey Skol Sister",
  description: "Smart, sisterly fantasy football advice—with Skol spirit.",
  metadataBase: new URL("https://theskolsisters.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hey Skol Sister",
    description: "Smart, sisterly fantasy football advice—with Skol spirit.",
    url: "https://theskolsisters.com",
    images: ["/og/default-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@SkolSisters",
    title: "Hey Skol Sister",
    description: "Smart, sisterly fantasy football advice—with Skol spirit.",
    images: ["/og/default-og.png"],
  },
  themeColor: "#4F2683",
};
export const metadata = {
    openGraph: {
    title: "Hey Skol Sister",
    description: "Fantasy football + Survivor energy.",
    url: process.env.SITE_URL || "https://www.theskolsisters.com",
    siteName: "Hey Skol Sister",
    images: [
      {
        url: `/og?t=${encodeURIComponent("Hey Skol Sister")}`,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hey Skol Sister",
    description: "Fantasy football + Survivor energy.",
    images: [`/og?t=${encodeURIComponent("Hey Skol Sister")}`],
  },
};

export default function RootLayout({ children }) {
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