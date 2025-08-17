// components/HyvorComments.jsx
"use client";

/**
 * Minimal Hyvor Talk embed that:
 * - Loads the embed script once (as a module)
 * - Reconfigures when pageId changes
 * 
 * Configure your site id via NEXT_PUBLIC_HYVOR_SITE_ID
 * (falls back to 13899 for local/demo).
 */

import { useEffect } from "react";

const SITE_ID = Number(process.env.NEXT_PUBLIC_HYVOR_SITE_ID || 13899);

export default function HyvorComments({ pageId }) {
  useEffect(() => {
    if (!pageId) return;
     // Configure (Hyvor reads these globals). Do this before loading the script
    // to ensure the embed picks up the correct values on first load.
    // eslint-disable-next-line no-undef
    window.HYVOR_TALK_WEBSITE = SITE_ID;
    // eslint-disable-next-line no-undef
    window.HYVOR_TALK_CONFIG = {
      id: pageId, // stable thread id per poll
      url: window.location.href, // best-effort; Hyvor updates on navigation
    };

    // Insert the script once
    const SCRIPT_ID = "hyvor-talk-script";
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://talk.hyvor.com/embed/embed.js";
      s.type = "module";
      s.async = true;
      document.body.appendChild(s);
    } else {
      // If already loaded, ask Hyvor to re-render with the new config
      // eslint-disable-next-line no-undef
      window.HYVOR_TALK?.reload?.();
    }
    
  }, [pageId]);

  return (
    <div className="card p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-3">Join the conversation</h3>
      <div id="hyvor-talk-view" />
    </div>
  );
}
