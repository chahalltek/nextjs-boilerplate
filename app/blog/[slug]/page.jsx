// app/blog/[slug]/page.jsx
import React from "react";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getAllPosts, getPostBySlug } from "@/lib/posts";
import HyvorComments from "@/components/HyvorComments";
import TagChips from "@/components/TagChips";
import RelatedByTags from "@/components/RelatedByTags";

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Not found — Hey Skol Sister" };
  return {
    title: `${post.title} — Hey Skol Sister`,
    description: post.excerpt || "",
  };
}

export default async function BlogPostPage({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return notFound();

  return (
    <>
      <article className="container py-12 prose prose-invert max-w-3xl">
        <h1>{post.title}</h1>
        {post.date ? (
          <p className="text-white/60">
            {new Date(post.date).toLocaleDateString()}
          </p>
        ) : null}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </article>
      {Array.isArray(frontmatter.tags) && <TagChips tags={frontmatter.tags} />}

      <section className="container max-w-3xl mt-10 mb-16">
        <h2 className="text-xl font-semibold mb-3">Join the conversation</h2>
        <HyvorComments
          // If you want to hard-pass the ID once for debugging, add:
          // websiteId={Number(process.env.NEXT_PUBLIC_HYVOR_WEBSITE_ID)}
          pageId={`blog:${post.slug}`}
          title={post.title}
        />
      </section>
    </>
  );
}

// Pre-render all post pages
export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}
{Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0 && (
   <RelatedByTags
     dir="content/posts"
     base="/blog"
     currentSlug={slug}
     currentTags={frontmatter.tags}
   />
 )}
