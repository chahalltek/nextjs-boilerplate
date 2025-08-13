import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllSlugs, getPostBySlug } from "@/lib/posts";
import HyvorComments from "@/components/HyvorComments";

export const runtime = "nodejs";         // ensure fs is allowed
export const dynamic = "force-static";   // pre-render posts at build
export const revalidate = false;         // no ISR, change to a number if you want it

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Not found — Skol Sisters" };
  return {
    title: `${post.title} — Skol Sisters`,
    description: post.excerpt || "",
  };
}

export default function BlogPostPage({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post || post.draft) return notFound();

  return (
    <div className="container py-12 max-w-3xl">
      <article className="prose prose-invert max-w-none">
        <h1>{post.title}</h1>
        {post.date && (
          <p className="text-white/60">
            {new Date(post.date).toLocaleDateString()}
          </p>
        )}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </article>

     // ...
      <div className="mt-10 border-t border-white/10 pt-8">
        <h2 className="text-xl font-semibold mb-3">Join the discussion</h2>
        <HyvorComments pageId={`blog:${post.slug}`} title={post.title} />
      </div>

    </div>
  );
}
