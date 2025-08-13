"use client";
import Giscus from "@giscus/react";

type RepoSlug = `${string}/${string}`;

export default function Comments() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO as RepoSlug | undefined;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID as string | undefined;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY as string | undefined;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID as string | undefined;

  // If not configured, hide widget (show a hint in dev)
  if (!repo || !repoId || !category || !categoryId) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className="text-sm text-white/60">
          Giscus is not configured. Set NEXT_PUBLIC_GISCUS_* env vars.
        </div>
      );
    }
    return null;
  }

  return (
    <Giscus
      repo={repo}
      repoId={repoId}
      category={category}
      categoryId={categoryId}
      mapping="pathname"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="bottom"
      theme="transparent_dark"
      lang="en"
      loading="lazy"
    />
  );
}
