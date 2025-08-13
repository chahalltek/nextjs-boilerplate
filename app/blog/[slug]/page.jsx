import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug } from "@/lib/posts";
import HyvorComments from "@/components/HyvorComments";

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
  if (!post) return notFound();

  return (
    <article className="container py-12 prose prose-invert max-w-3xl">
      <h1>{post.title}</h1>
      {post.date && (
        <p className="text-white/60">
          {new Date(post.date).toLocaleDateString()}
        </p>
      )}

      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {post.content}
      </ReactMarkdown>

      {/* CTA that jumps to the comments */}
      <div className="mt-10 flex justify-center">
        <a href="#hyvor-talk-view" className="cta-card inline-flex items-center gap-2">
          <span>Join the conversation</span>
          <span aria-hidden>→</span>
        </a>
      </div>

      {/* Comments */}
      <section className="mt-8" aria-label="Comments">
        <HyvorComments pageId={`blog:${post.slug}`} title={post.title} />
      </section>
    </article>
  );
}
