"use client";
import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({
  pageId,
  title,
}: {
  pageId: string;
  title?: string;
}) {
  // Use the same env var name you already set in Vercel
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID);
  return (
    <Comments
      websiteId={websiteId}
      pageId={pageId}
      pageTitle={title || "Discussion"}
    />
  );
}

