// components/HyvorComments.jsx
"use client";
import dynamic from "next/dynamic";

const Comments = dynamic(
  () => import("@hyvor/hyvor-talk-react").then(m => m.Comments),
  { ssr: false }
);

export default function HyvorComments({ pageId, title }) {
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID || "");
  if (!websiteId) {
    return <div className="text-red-400 text-sm">HYVOR website ID missing</div>;
  }
  return (
    <div className="mt-4">
      <Comments website-id={websiteId} page-id={pageId} title={title} />
    </div>
  );
}
