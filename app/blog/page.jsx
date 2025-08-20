// app/blog/page.jsx
import Link from "next/link";
import matter from "gray-matter";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adds <link rel="alternate" type="application/rss+xml" href="/blog/rss">
export const metadata = {
  title: "Blog — Hey Skol Sister",
  description: "News, notes, and rants from Hey Skol Sister.",
  alternates: {
    types: {
      "application/rss+xml": "/blog/rss",
    },
  },
};

const DIR = "content/posts";
const b64 = (s) => Buffer.from(s || "", "base64").toString("utf8");

// Parse YYYY-M-D (or YYYY-MM-DD, etc.) into a UTC timestamp
function toUtcTs(dateStr) {
  if (!dateStr) return NaN;
  // Prefer an explicit Y-M-D in the front matter
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const
