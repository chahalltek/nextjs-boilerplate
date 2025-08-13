// app/blog/[slug]/page.jsx
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug } from "@/lib/posts";
import CommentsEmbed from "@/components/CommentsEmbed";

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Post not found — The Skol Sisters" };
  return {
    title: `${post.title} — The Skol Sisters`,
    description: post.excerpt || "",
  };
}

export default function BlogPost({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return notFound();

  return (
    <div className="container py-12 max-w-3xl">
      <article className="prose prose-invert max-w-none">
        <h1>{post.title}</h1>
        {post.date && (
          <p className="text-white/60 text-sm">
            {new Date(post.date).toLocaleDateString()}
          </p>
        )}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </article>

      <section className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Comments</h2>
  <CommentsEmbed
    identifier={post.slug}
    title={post.title}
    url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.theskolsisters.com"}/blog/${post.slug}`}
  />
</section>
    </div>
  );
}
