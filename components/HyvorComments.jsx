"use client";
import Script from "next/script";

export default function HyvorComments({ pageId, title }) {
  const websiteId = process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || "";

  // Nice fallback so the page still renders if the env var is missing
  if (!websiteId) {
    return (
      <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/70">
        HYVOR site id is not set. Add <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> and redeploy.
      </div>
    );
  }

  return (
    <>
      {/* 1) Define globals BEFORE the embed script runs */}
      <Script id="hyvor-config" strategy="beforeInteractive">
        {`
          window.HYVOR_TALK_WEBSITE = ${JSON.stringify(websiteId)};
          window.HYVOR_TALK_CONFIG = {
            id: ${JSON.stringify(pageId)},
            title: ${JSON.stringify(title || pageId)},
            url: window.location.href
          };
        `}
      </Script>

      {/* 2) Load the embed AFTER the globals exist */}
      <Script src="https://talk.hyvor.com/embed/embed.js" strategy="afterInteractive" />

      {/* 3) The mount point */}
      <div id="hyvor-talk-view" />
    </>
  );
}
