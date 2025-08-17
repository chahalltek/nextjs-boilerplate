// app/blog/[slug]/page.jsx
import { notFound } from "next/navigation";
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = dynamic(() => import("@/components/HyvorComments"), { ssr: false });

export default async function BlogPostPage({ params }) {
  const slug = params?.slug;
  if (!slug) notFound();

  const path = `content/posts/${slug}.md`;
  const file = await getFile(path);
  if (!file?.contentBase64) notFound();

  const md = Buffer.from(file.contentBase64, "base64").toString("utf8");
  const parsed = matter(md);
  const fm = parsed.data || {};

  const title = fm.title || slug;
  const date = fm.date || "";
  const excerpt = fm.excerpt || "";

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      {date && <div className="text-sm text-white/60">{date}</div>}
      <h1 className="text-3xl font-bold">{title}</h1>
      {excerpt && <p className="text-white/80">{excerpt}</p>}

      <div className="prose prose-invert max-w-none">
        <ReactMarkdown>{parsed.content || ""}</ReactMarkdown>
      </div>

      {/* Hyvor comments (same pattern as elsewhere) */}
      <div className="mt-10">
        <HyvorComments pageId={`blog-${slug}`} />
      </div>
    </div>
  );
}
