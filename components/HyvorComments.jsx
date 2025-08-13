"use client";
import { useEffect } from "react";
import Script from "next/script";

export default function HyvorComments({ pageId, title = "" }) {
  // This is replaced at build-time. Make sure it exists in Vercel for ALL envs.
  const siteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || 0);

  // If siteId is missing, show a tiny hint (prevents a blank page).
  if (!siteId) {
    return (
      <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm">
        Hyvor Website ID is not set. Add <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> in Vercel
        and redeploy.
      </div>
    );
  }

  // Make Hyvor reload when the page id changes (client-side nav).
  useEffect(() => {
    if (typeof window !== "undefined" && window.HYVOR_TALK) {
      try {
        window.HYVOR_TALK.reload();
      } catch {}
    }
  }, [pageId]);

  return (
    <>
      {/* 1) Define config BEFORE loading embed.js */}
      <Script id="hyvor-talk-config" strategy="afterInteractive">
        {`
          window.HYVOR_TALK_WEBSITE = ${JSON.stringify(siteId)};
          window.HYVOR_TALK_CONFIG = {
            id: ${JSON.stringify(pageId)},
            url: window.location.href,
            title: ${JSON.stringify(title)}
          };
        `}
      </Script>

      {/* 2) Hyvor mount point */}
      <div id="hyvor-talk-view" key={pageId} />

      {/* 3) Loader */}
      <Script
        src="https://talk.hyvor.com/embed/embed.js"
        strategy="afterInteractive"
      />
    </>
  );
}
