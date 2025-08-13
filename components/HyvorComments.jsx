"use client";
import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({ pageId, title }) {
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || 0);

  if (!websiteId) {
    return (
      <div className="mt-6 rounded border border-white/15 bg-white/5 p-4 text-sm">
        <p className="font-medium">Comments are not configured</p>
        <p className="text-white/70 mt-1">
          Set <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> to your numeric Hyvor
          Website ID and redeploy.
        </p>
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
