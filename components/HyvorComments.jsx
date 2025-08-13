// components/HyvorComments.jsx
"use client";
import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({ pageId, title }) {
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || 0);
  if (!websiteId) return null; // avoid rendering if env var missing

  return (
    <Comments
      websiteId={websiteId}
      pageId={String(pageId)}
      pageTitle={title || "Discussion"}
      key={String(pageId)} // ensures thread switches on route change
    />
  );
}


