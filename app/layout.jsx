import "./../styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "The Skol Sisters",
  description: "Smart, sisterly fantasy football advice—with Skol spirit.",
  metadataBase: new URL("https://theskolsisters.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "The Skol Sisters",
    description: "Smart, sisterly fantasy football advice—with Skol spirit.",
    url: "https://theskolsisters.com",
    images: ["/og/default-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@SkolSisters",
    title: "The Skol Sisters",
    description: "Smart, sisterly fantasy football advice—with Skol spirit.",
    images: ["/og/default-og.png"],
  },
  themeColor: "#4F2683",
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