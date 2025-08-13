"use client";

import Giscus from "@giscus/react";

type Props = {
  /** Optional label above the widget */
  title?: string;
};

export default function Comments({ title = "Join the conversation" }: Props) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
        <Giscus
          id="comments"
          repo="chahalltek/nextjs-boilerplate"        // ← from giscus.app
          repoId="R_kgDOPcRugw"                         // ← from giscus.app
          category="Announcements"                      // ← or your category name
          categoryId="DIC_kwDOPcRug84CuIQdD"                 // ← from giscus.app
          mapping="pathname"                       // map each post by URL path
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme="transparent_dark"                 // matches your Skol theme
          lang="en"
          loading="lazy"
        />
      </div>
      <noscript className="text-sm text-white/60">
        Comments require JavaScript. You can also reply directly in our GitHub
        Discussions.
      </noscript>
    </section>
  );
}
