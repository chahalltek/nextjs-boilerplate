// components/HyvorComments.jsx
"use client";

import { useEffect } from "react";

export default function HyvorComments({ pageId, title }) {
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || 0);

  useEffect(() => {
    if (!websiteId) return;

    // 1) Set required globals BEFORE loading the script
    //    (Hyvor reads these on initial load)
    // eslint-disable-next-line no-undef
    window.HYVOR_TALK_WEBSITE = websiteId;
    // eslint-disable-next-line no-undef
    window.HYVOR_TALK_CONFIG = {
      id: pageId,
      url: window.location.href, // canonical is fine too if you have it
      title: title || document.title,
    };

    // 2) Remove any previous embed (navigating between posts)
    const old = document.getElementById("hyvor-talk-script");
    if (old) old.remove();

    // 3) Inject embed script AFTER we’ve set the globals
    const s = document.createElement("script");
    s.src = "https://talk.hyvor.com/embed/embed.js";
    s.async = true;
    s.id = "hyvor-talk-script";
    document.body.appendChild(s);

    return () => {
      // Optional cleanup of the view div content when unmounting
      const view = document.getElementById("hyvor-talk-view");
      if (view) view.innerHTML = "";
    };
  }, [websiteId, pageId, title]);

  if (!websiteId) {
    // Helpful message in non-prod or when env is missing
    return (
      <p className="text-sm text-red-300">
        HYVOR website ID is not set. Define NEXT_PUBLIC_HYVOR_WEBSITE_ID in your env.
      </p>
    );
  }

  return <div id="hyvor-talk-view" />;
}
