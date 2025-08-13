"use client";
import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({ pageId, title }) {
  const siteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID);

  if (!siteId || Number.isNaN(siteId)) {
    return (
      <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-200">
        Website ID not set. Define <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> and redeploy.
      </div>
    );
  }

  // pageUrl only exists in the browser; Comments handles empty string fine during SSR.
  const pageUrl =
    typeof window !== "undefined" ? window.location.href : "";

  return (
    <Comments
      websiteId={siteId}
      pageId={pageId}
      pageTitle={title || ""}
      pageUrl={pageUrl}
    />
  );
}
