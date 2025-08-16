// app/cws/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = dynamic(() => import("@/components/HyvorComments"), { ssr: false });

async function loadRecapBySlug(slug) {
  // Try several filename variants to avoid “slug vs title” mismatches.
  const candidates = [
    `content/recaps/${slug}.md`,
    `content/recaps/${slug.replace(/-/g, " ")}.md`,
    `content/recaps/${slug.toLowerCase()}.md`,
  ];

  for (const path of candidates) {
    try {
      const f = await getFile(path);
      if (f?.contentBase64) return f;
    } catch {
      // keep trying
    }
  }
  return null;
}

export default async function CwsDetailPage({ params }) {
  const slug = decodeURIComponent(params.slug);
  const file = await loadRecapBySlug(slug);
  if (!file?.contentBase64) return notFound();

  const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const title = fm.title || slug;
  const date = fm.date || "";

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <div className="text-sm text-white/60">{date}</div>
      <h1 className="text-2xl font-bold">{title}</h1>

      <article className="prose prose-invert max-w-none card p-5">
        <ReactMarkdown>{parsed.content || ""}</ReactMarkdown>
      </article>

      {/* Comments / reactions */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-3">Comments & reactions</h2>
        <HyvorComments pageId={`cws-${slug}`} />
      </div>
    </div>
  );
}
