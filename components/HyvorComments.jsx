"use client";
import { useEffect } from "react";

export default function HyvorComments({ pageId, title = "" }) {
  const siteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || 0);

  // show a friendly hint if the env var is missing
  if (!siteId) {
    return (
      <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm">
        Hyvor Website ID is not set. Define <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> and redeploy.
      </div>
    );
  }

  useEffect(() => {
    // 1) set config on every visit / route change
    window.HYVOR_TALK_WEBSITE = siteId;
    window.HYVOR_TALK_CONFIG = {
      id: pageId,
      url: window.location.href,
      title,
    };

    // 2) inject the loader once, else reload
    const selector = 'script[data-hyvor="embed"]';
    let script = document.querySelector(selector);
    if (!script) {
      script = document.createElement("script");
      script.src = "https://talk.hyvor.com/embed/embed.js";
      script.async = true;
      script.defer = true;
      script.setAttribute("data-hyvor", "embed");
      document.body.appendChild(script);
    } else if (window.HYVOR_TALK && typeof window.HYVOR_TALK.reload === "function") {
      try { window.HYVOR_TALK.reload(); } catch {}
    }
  }, [siteId, pageId, title]);

  return <div id="hyvor-talk-view" key={pageId} />;
}
