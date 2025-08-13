"use client";
import Script from "next/script";

export default function HyvorComments({ pageId }) {
  const siteId = process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || "";
  return (
    <>
      <div id="hyvor-talk-view" />
      <Script src="https://talk.hyvor.com/embed/embed.js" strategy="lazyOnload" />
      <Script id={`hyvor-config-${pageId}`} strategy="lazyOnload">
        {`
          window.HYVOR_TALK_WEBSITE = ${JSON.stringify(siteId)};
          window.HYVOR_TALK_CONFIG = {
            id: ${JSON.stringify(pageId)},
            url: window.location.href
          };
        `}
      </Script>
    </>
  );
}
