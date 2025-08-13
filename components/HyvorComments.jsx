// components/HyvorComments.jsx
"use client";

import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({ pageId, title }) {
  // MUST be a number for the SDK
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID);

  if (!websiteId) {
    return (
      <div className="mt-6 rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-red-200">
        Hyvor Website ID is missing or invalid. Set <code>NEXT_PUBLIC_HYVOR_WEBSITE_ID</code> (e.g. <code>13899</code>) and redeploy.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Comments websiteId={websiteId} pageId={pageId} pageTitle={title} />
    </div>
  );
}
