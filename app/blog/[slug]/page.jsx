// app/blog/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = nextDynamic(() => import("@/components/HyvorComments"), { ssr: false });

export default async function BlogPostPage({ params }) {
  const path = `content/posts/${params.slug}.md`;
  const file = await getFile(path);
  if (!file?.contentBase64) return notFound();

  const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
  const parsed = matter(raw);
  const fm = parsed.data || {};
  if (fm.draft) return notFound();

  const pageId = `blog:${params.slug}`;

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <Link href="/blog" className="text-white/70 hover:text-white">← Back to Blog</Link>

      <article className="space-y-3">
        <div className="text-sm text-white/60">{fm.date}</div>
        <h1 className="text-3xl font-bold">{fm.title || params.slug}</h1>
        {fm.excerpt && <p className="text-white/80">{fm.excerpt}</p>}
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{parsed.content}</ReactMarkdown>
        </div>
      </article>

      <div className="card p-4">
        <HyvorComments pageId={pageId} />
      </div>
    </div>
  );
}
