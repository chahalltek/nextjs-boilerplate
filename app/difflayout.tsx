--- a/app/layout.tsx
+++ b/app/layout.tsx
@@
-import { Geist, Geist_Mono } from "next/font/google";
+import { GeistSans } from "geist/font/sans";
+import { GeistMono } from "geist/font/mono";
 
-const geist = Geist({ subsets: ["latin"] });
-const geistMono = Geist_Mono({ subsets: ["latin"] });
+// No config needed; the package ships the font files.
 
 export const metadata = {
   title: "The Skol Sisters",
 };
 
 export default function RootLayout({
   children,
 }: {
   children: React.ReactNode;
 }) {
   return (
     <html lang="en">
-      <body className={`${geist.className} ${geistMono.className}`}>
+      <body className={`${GeistSans.className} ${GeistMono.className}`}>
         {children}
       </body>
     </html>
   );
 }

