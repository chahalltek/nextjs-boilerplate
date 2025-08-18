"use client";
import { Comments } from "@hyvor/hyvor-talk-react";

export default function HyvorComments({ pageId }: { pageId: string | number }) {
  const websiteId = Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID);
  if (!websiteId) return null; // no crash in dev if env missing
  return <Comments {...{ "website-id": websiteId, "page-id": String(pageId) }} />;
}