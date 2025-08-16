// components/HyvorComments.jsx
"use client";

import { useEffect } from "react";

// Optional: set NEXT_PUBLIC_HYVOR_SITE_ID in Vercel; falls back to your current ID.
const HYVOR_SITE_ID = Number(process.env.NEXT_PUBLIC_HYVOR_SITE_ID || 13899);

/**
 * Minimal Hyvor Talk embed (same method your blog uses)
 * - uses window._hyvor_talk
 * - loads official embed.js (module)
 * - re-inits when pageId changes
 */
export default function HyvorComments({ pageId }) {
  useEffect(() => {
    if (!pageId) return;

    // Clear any previous mount
    const holder = document.getElementById("hyvor-talk-view");
    if (holder) holder.innerHTML = "";

    // Remove previous script so Hyvor re-initializes cleanly
    const old = document.getElementById("hyvor-talk-script");
    if (old) old.remove();

    // Configure page
    window._hyvor_talk = {
      website: HYVOR_SITE_ID,
      page_id: pageId,
    };

    // Inject script
    const s = document.createElement("script");
    s.id = "hyvor-talk-script";
    s.src = "https://talk.hyvor.com/embed/embed.js";
    s.type = "module";
    s.async = true;
    document.body.appendChild(s);
  }, [pageId]);

  return <div id="hyvor-talk-view" />;
}


