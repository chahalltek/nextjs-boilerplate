// components/HyvorComments.jsx
"use client";

import { useEffect } from "react";

export default function HyvorComments({ pageId, title }) {
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || "");

  useEffect(() => {
    if (!websiteId) {
      console.error("[HYVOR] Missing NEXT_PUBLIC_HYVOR_WEBSITE_ID");
      return;
    }

    // Clear any previous render (client-side nav)
    const view = document.getElementById("hyvor-talk-view");
    if (view) view.innerHTML = "";

    // Set globals BEFORE loading script
    window.HYVOR_TALK_WEBSITE = websiteId;
    window.HYVOR_TALK_CONFIG = {
      id: pageId,
      url: window.location.href,
      title: title || document.title,
    };

    // Inject script (fresh each time)
    const existing = document.getElementById("hyvor-talk-script");
    if (existing) existing.remove();
    const s = document.createElement("script");
    s.src = "https://talk.hyvor.com/embed/embed.js";
    s.async = true;
    s.id = "hyvor-talk-script";

    s.onload = () => console.log("[HYVOR] embed loaded");
    s.onerror = () => console.error("[HYVOR] failed to load embed.js (CSP or network?)");

    document.body.appendChild(s);

    return () => {
      // clean up between route changes
      const scr = document.getElementById("hyvor-talk-script");
      if (scr) scr.remove();
      const v = document.getElementById("hyvor-talk-view");
      if (v) v.innerHTML = "";
    };
  }, [websiteId, pageId, title]);

  return (
    <>
      <div id="hyvor-talk-view" key={pageId} />
      <div className="mt-2 text-xs text-white/40">
        hyvor site: {websiteId || "MISSING"} • pageId: {pageId}
      </div>
    </>
  );
}
