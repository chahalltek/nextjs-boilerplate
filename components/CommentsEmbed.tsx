// components/CommentsEmbed.tsx
"use client";
import Script from "next/script";

export default function CommentsEmbed() {
  return (
    <>
      {/* HYVOR example */}
      {/* <div id="hyvor-talk-view" />
      <Script src="https://talk.hyvor.com/web-api/embed.js" strategy="lazyOnload" />
      <Script id="hyvor-init" strategy="lazyOnload">{`
        HyvorTalkEmbed.init({
          websiteId: "${process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID}",
          page: { id: window.location.pathname, url: window.location.href }
        });
      `}</Script> */}

      {/* DISQUS example */}
      <div id="disqus_thread" />
      <Script id="dsq-config" strategy="lazyOnload">{`
        var disqus_config = function () {
          this.page.url = window.location.href;
          this.page.identifier = window.location.pathname;
        };
      `}</Script>
      <Script
        src="https://YOUR_SHORTNAME.disqus.com/embed.js"
        strategy="lazyOnload"
      />
    </>
  );
}
