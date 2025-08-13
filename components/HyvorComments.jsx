"use client";

import Script from "next/script";

export default function HyvorComments({ pageId, title }) {
  // Ensure we pass a NUMBER to Hyvor, not a string
  const raw = process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID;
  const siteId = Number(raw);

  if (!siteId || Number.isNaN(siteId)) {
    return (
      <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-200">
        Website ID not set. Set <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> in Vercel (Production/Preview/Development)
        and redeploy.
      </div>
    );
  }

  // Keep config BEFORE loader script
  const cfg = `
    var HYVOR_TALK_WEBSITE = ${siteId};
    var HYVOR_TALK_CONFIG = {
      id: ${JSON.stringify(pageId || "")},
      url: window.location.href,
      title: ${JSON.stringify(title || "")}
    };
  `;

  return (
    <>
      <div id="hyvor-talk-view" />
      <Script id="hyvor-talk-config" strategy="afterInteractive">{cfg}</Script>
      <Script src="https://talk.hyvor.com/embed/embed.js" strategy="afterInteractive" />
    </>
  );
}
