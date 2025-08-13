// components/HyvorComments.jsx
"use client";

import { useEffect } from "react";

export default function HyvorComments({ pageId, title }) {
  // READ the public env at runtime (client)
  const websiteIdRaw = process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || "";
  const websiteIdNum = Number(websiteIdRaw);

  useEffect(() => {
    if (!websiteIdNum) return;

    // 1) Set globals BEFORE loading the script
    window.HYVOR_TALK_WEBSITE = websiteIdNum;
    window.HYVOR_TALK_CONFIG = {
      id: pageId,
      url: window.location.href,
      title: title || document.title,
    };

    // 2) Remove any previous embed instance (client-side nav between posts)
    const prev = document.getElementById("hyvor-talk-script");
    if (prev) prev.remove();

    // 3) Inject the embed AFTER globals are set
    const s = document.createElement("script");
    s.src = "https://talk.hyvor.com/embed/embed.js";
    s.async = true;
    s.id = "hyvor-talk-script";
    document.body.appendChild(s);

    return () => {
      const view = document.getElementById("hyvor-talk-view");
      if (view) view.innerHTML = "";
    };
  }, [websiteIdNum, pageId, title]);

  // Visible debug (helpful on production):
  return (
    <>
      <div id="hyvor-talk-view" />
      <div className="mt-2 text-xs text-white/40">
        hyvor site: {websiteIdNum || "MISSING"} • pageId: {pageId}
      </div>
    </>
  );
}
