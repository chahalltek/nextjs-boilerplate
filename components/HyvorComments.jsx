"use client";
import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({ pageId, title }) {
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || 0);

  if (!websiteId) {
    return (
      <div className="mt-6 rounded-md border border-red-400/40 bg-red-500/10 p-4 text-red-200">
        Comments are misconfigured. Set <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> in Vercel.
      </div>
    );
  }

  return (
    <div id="hyvor-talk-view" className="mt-8">
      <Comments
        websiteId={websiteId}
        pageId={pageId}
        pageTitle={title}
        pageUrl={typeof window !== "undefined" ? window.location.href : undefined}
      />
    </div>
  );
}
