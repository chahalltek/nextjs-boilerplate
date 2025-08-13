"use client";
import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({ pageId, title, websiteId: websiteIdProp }) {
  // Prefer a prop if provided; otherwise read from env
  const websiteId = Number(websiteIdProp ?? process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID ?? 0);

  if (typeof window !== "undefined") {
    console.info("[HYVOR] websiteId =", websiteId, "pageId =", pageId, "title =", title);
  }

  if (!websiteId) {
    return (
      <div className="mt-6 rounded border border-white/15 bg-white/5 p-4 text-sm">
        <p className="font-medium">Comments are not configured</p>
        <p className="text-white/70 mt-1">
          Set <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> (numeric) in Vercel and redeploy, or pass <code>websiteId</code> as a prop.
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
