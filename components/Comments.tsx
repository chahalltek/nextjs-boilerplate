"use client";
import Giscus from "@giscus/react";

export default function Comments({ title = "Join the conversation" }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
        <Giscus
          id="comments"
          repo="YOUR_GITHUB_USER/YOUR_REPO"
          repoId="REPO_ID"
          category="Comments"
          categoryId="CATEGORY_ID"
          mapping="pathname"
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme="transparent_dark"
          lang="en"
          loading="lazy"
        />
      </div>
    </section>
  );
}
