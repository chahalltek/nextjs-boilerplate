import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import Comments from "@/components/Comments";

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug); // your existing loader

  return (
    <div className="container py-12 max-w-3xl">
      <article className="prose prose-invert max-w-none">
        <h1>{post.title}</h1>
        {/* …post content… */}
      </article>

      {/* Comments */}
      <Comments />
    </div>
  );
}
export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Not found — Skol Sisters" };
  return { title: `${post.title} — Skol Sisters`, description: post.excerpt || "" };
}

export default function BlogPost({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return notFound();

  return (
    <article className="container py-12 prose prose-invert max-w-3xl">
      <h1>{post.title}</h1>
      {post.date && <p className="text-white/60">{new Date(post.date).toLocaleDateString()}</p>}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
    </article>
  );
}