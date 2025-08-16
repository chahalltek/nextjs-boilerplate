"use client";

/**
 * Minimal Hyvor Talk loader used across the site.
 * - Requires NEXT_PUBLIC_HYVOR_SITE_ID
 * - Unique per-page thread via `pageId` (e.g., "poll:<slug>" or "blog:<slug>")
 */
import { useEffect } from "react";

export default function HyvorComments({ pageId }) {
  const siteId = process.env.NEXT_PUBLIC_HYVOR_SITE_ID;

  useEffect(() => {
    if (!siteId || !pageId) return;

    // reset the container so reloading a different pageId works reliably
    const container = document.getElementById("hyvor-talk-view");
    if (container) container.innerHTML = "";

    // global config consumed by embed.js
    // eslint-disable-next-line no-undef
    window.HYVOR_TALK_WEBSITE = siteId;
    // eslint-disable-next-line no-undef
    window.HYVOR_TALK_CONFIG = {
      url: typeof window !== "undefined" ? window.location.href : "",
      id: pageId,
    };

    // load (or reload) script
    const existing = document.getElementById("hyvor-embed-js");
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://talk.hyvor.com/web-api/embed.js";
      s.async = true;
      s.defer = true;
      s.id = "hyvor-embed-js";
      document.body.appendChild(s);
    } else {
      // eslint-disable-next-line no-undef
      if (window.HyvorTalk && typeof window.HyvorTalk.reload === "function") {
        // @ts-ignore
        window.HyvorTalk.reload();
      }
    }
  }, [siteId, pageId]);

  if (!siteId) {
    return (
      <div className="text-sm text-red-400">
        Comments unavailable: <code>NEXT_PUBLIC_HYVOR_SITE_ID</code> is not set.
      </div>
    );
  }

  return <div id="hyvor-talk-view" />;
}
