// components/HyvorComments.jsx
"use client";

import { useEffect } from "react";

const HYVOR_SITE_ID = 13899; // same site ID you use on the blog

/**
 * Minimal Hyvor Talk embed, identical method to blog:
 * - Uses window._hyvor_talk
 * - Loads the official 'embed.js' (module) script
 * - Re-initializes when pageId changes
 */
export default function HyvorComments({ pageId }: { pageId: string }) {
  useEffect(() => {
    if (!pageId) return;

    // Clear previous mount (if any)
    const holder = document.getElementById("hyvor-talk-view");
    if (holder) holder.innerHTML = "";

    // Remove previously injected script to force a clean init
    const old = document.getElementById("hyvor-talk-script");
    if (old) old.remove();

    // Hyvor config (same as blog)
    (window as any)._hyvor_talk = {
      website: HYVOR_SITE_ID,
      page_id: pageId,
    };

    const s = document.createElement("script");
    s.id = "hyvor-talk-script";
    s.src = "https://talk.hyvor.com/embed/embed.js";
    s.type = "module";
    s.async = true;
    document.body.appendChild(s);
  }, [pageId]);

  return <div id="hyvor-talk-view" />;
}

