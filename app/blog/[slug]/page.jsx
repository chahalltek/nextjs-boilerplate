// app/blog/[slug]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Comments from "@/components/Comments";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
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
    <div className="container py-12 max-w-3xl">
      <p className="text-sm text-white/60">
        <Link href="/blog" className="hover:underline">← Back to blog</Link>
      </p>

      <article className="prose prose-invert max-w-none mt-4">
        <h1 className="!mb-2">{post.title}</h1>
        {post.date && (
          <p className="text-white/60 !mt-0">
            {new Date(post.date).toLocaleDateString()}
            {post.tags?.length ? <> · {post.tags.join(", ")}</> : null}
          </p>
        )}

        {post.excerpt && <p className="text-white/80 mt-4">{post.excerpt}</p>}

        <div className="mt-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content || ""}
          </ReactMarkdown>
        </div>
      </article>

      {/* Comments */}
      <div className="mt-12">
        <Comments />
      </div>
    </div>
  );
}
