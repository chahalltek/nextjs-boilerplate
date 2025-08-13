"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function HyvorComments({ pageId, title }) {
  const pathname = usePathname();
  const siteId = process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || "";

  useEffect(() => {
    if (!siteId) return;

    // Prepare config for this page/thread
    const config = {
      id: pageId,                  // unique per post, e.g. "blog:my-post"
      url: window.location.href,   // canonical URL for the thread
      title: title || document.title,
    };

    // If embed script already loaded (client-side nav), just reload
    if (window.HYVOR_TALK?.reload) {
      window.HYVOR_TALK.reload(config);
      return;
    }

    // First load: set globals then inject the script once
    window.HYVOR_TALK_WEBSITE = siteId;
    window.HYVOR_TALK_CONFIG = config;

    // Avoid double-injecting the script
    if (!document.getElementById("hyvor-talk-embed-js")) {
      const s = document.createElement("script");
      s.src = "https://talk.hyvor.com/embed/embed.js";
      s.async = true;
      s.defer = true;
      s.id = "hyvor-talk-embed-js";
      document.body.appendChild(s);
    }
  }, [siteId, pageId, title, pathname]);

  return <div id="hyvor-talk-view" />;
}
