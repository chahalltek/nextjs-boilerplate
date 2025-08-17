// app/admin/cws/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = "content/recaps";

export default async function AdminCwsEditPage({ params }) {
  const { slug } = params || {};
  const path = `${DIR}/${slug}.md`;

  let fm = {};
  let content = "";

  try {
    const file = await getFile(path);
    if (file?.contentBase64) {
      const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
      const parsed = matter(raw);
      fm = parsed?.data || {};
      content = parsed?.content || "";
    }
  } catch {
    // If the file doesn't exist yet, we just render with empty defaults.
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Edit Recap</h1>
        <Link
          href="/admin/cws"
          className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white hover:bg-white/10"
        >
          ← All recaps
        </Link>
      </div>

      {/* Read-only preview for now (keeps build green). 
          If you want inline editing here, we’ll wrap a small client component around this. */}
      <div className="card p-5 space-y-3">
        <div className="text-sm text-white/60">{fm.date || ""}</div>
        <div className="text-xl font-semibold">{fm.title || slug}</div>
        {fm.excerpt && <p className="text-white/80">{fm.excerpt}</p>}
        <pre className="whitespace-pre-wrap text-white/80">{content}</pre>
      </div>
    </div>
  );
}
