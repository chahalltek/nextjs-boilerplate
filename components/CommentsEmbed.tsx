'use client';

import Script from 'next/script';
"use client";
import { useEffect } from "react"

type Props = {
  identifier: string;
  title: string;
  url: string; // absolute URL
};

export default function CommentsEmbed({ identifier, title, url }: Props) {
  const shortname = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;

  if (!shortname) {
    // Visible fallback so we know why it's empty
    return (
      <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-red-400">
        Disqus shortname is missing. Set <code>NEXT_PUBLIC_DISQUS_SHORTNAME</code> in Vercel.
      </div>
    );
  }

  // Escapes for inline config
  const esc = (s: string) => s.replaceAll('\\', '\\\\').replaceAll('"', '\\"');

  return (
    <div className="mt-10">
      {/* Disqus config MUST be defined before the embed.js loads */}
      <Script
        id="dsq-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            var disqus_config = function () {
              this.page.url = "${esc(url)}";
              this.page.identifier = "${esc(identifier)}";
              this.page.title = "${esc(title)}";
            };
          `,
        }}
      />
      <Script
        id="dsq-embed"
        strategy="afterInteractive"
        src={`https://${shortname}.disqus.com/embed.js`}
        onError={() => {
          // Simple visual hint if something blocks the script
          const el = document.getElementById('disqus_thread');
          if (el) el.innerHTML =
            '<div style="padding:12px;border:1px solid #ff6b6b33;border-radius:12px;background:#ff6b6b0d;color:#ff9a9a">We were unable to load Disqus. If you use an ad/tracker blocker, please allow disqus.com and reload.</div>';
        }}
      />

      <div id="disqus_thread" className="rounded-xl border border-white/10 bg-white/[0.04] p-4" />

      {/* Optional stylistic overrides for dark theme */}
      <style jsx global>{`
        #disqus_thread a { color: var(--skol-gold, #ffc62f) !important; }
        #disqus_thread, #disqus_thread * { color: rgba(255,255,255,0.92) !important; }
        #disqus_thread iframe { background: transparent !important; }
      `}</style>
    </div>
  );
}
