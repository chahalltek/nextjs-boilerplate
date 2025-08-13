// components/CommentsEmbed.tsx
"use client";
import { useEffect } from "react";

type Props = {
  identifier?: string;
  title?: string;
  url?: string;
};

declare global {
  interface Window {
    DISQUS?: { reset: (opts: { reload: boolean; config: () => void }) => void };
    disqus_config?: () => void;
  }
}

export default function CommentsEmbed({ identifier, title, url }: Props) {
  useEffect(() => {
    const shortname = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;
    if (!shortname) {
      console.warn("Missing NEXT_PUBLIC_DISQUS_SHORTNAME");
      return;
    }

    function disqus_config(this: any) {
      this.page.identifier = identifier || window.location.pathname;
      this.page.title = title || document.title;
      this.page.url =
        url ||
        (typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : undefined);
    }

    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true, config: disqus_config });
      return;
    }

    window.disqus_config = disqus_config;
    const s = document.createElement("script");
    s.src = `https://${shortname}.disqus.com/embed.js`;
    s.async = true;
    s.setAttribute("data-timestamp", Date.now().toString());
    (document.head || document.body).appendChild(s);
  }, [identifier, title, url]);

  return <div id="disqus_thread" className="mt-8" />;
}
