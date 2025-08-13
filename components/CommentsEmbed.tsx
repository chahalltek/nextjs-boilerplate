// components/CommentsEmbed.jsx
"use client";
import { useEffect } from "react";

export default function CommentsEmbed({ identifier, title, url }) {
  useEffect(() => {
    const shortname = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;
    if (!shortname) {
      console.warn("Missing NEXT_PUBLIC_DISQUS_SHORTNAME");
      return;
    }

    function disqus_config() {
      this.page.identifier = identifier || window.location.pathname;
      this.page.title = title || document.title;
      // Use canonical URL without hash; Disqus requires a stable, absolute URL
      this.page.url =
        url ||
        (typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : undefined);
    }

    // If Disqus already loaded, just reset it for this page
    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true, config: disqus_config });
      return;
    }

    // First load: set config and inject script
    window.disqus_config = disqus_config;
    const s = document.createElement("script");
    s.src = `https://${shortname}.disqus.com/embed.js`;
    s.async = true;
    s.setAttribute("data-timestamp", Date.now().toString());
    (document.head || document.body).appendChild(s);

    // no cleanup API from Disqus; leaving script is fine across pages
  }, [identifier, title, url]);

  return <div id="disqus_thread" className="mt-8" />;
}
