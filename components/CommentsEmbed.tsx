// components/CommentsEmbed.tsx
'use client';

import Script from 'next/script';
import { useEffect } from 'react';

type Props = {
  identifier: string; // unique per post (e.g., slug)
  title: string;
  url: string;       // canonical URL for the post
};

export default function CommentsEmbed({ identifier, title, url }: Props) {
  const shortname = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;

  useEffect(() => {
    (window as any).disqus_config = function () {
      // @ts-ignore - Disqus sets `this` to its config object
      this.page.url = url;
      // @ts-ignore
      this.page.identifier = identifier;
      // @ts-ignore
      this.page.title = title;
    };
  }, [identifier, title, url]);

  if (!shortname) {
    return <p className="text-red-400 text-sm">Disqus shortname missing (set NEXT_PUBLIC_DISQUS_SHORTNAME).</p>;
  }

  return (
    <div className="mt-10">
      <div id="disqus_thread" />
      <Script
        src={`https://${shortname}.disqus.com/embed.js`}
        strategy="lazyOnload"
        onError={(e) => console.error('Disqus failed to load', e)}
      />
      <noscript>
        Please enable JavaScript to view the{' '}
        <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a>
      </noscript>
    </div>
  );
}
