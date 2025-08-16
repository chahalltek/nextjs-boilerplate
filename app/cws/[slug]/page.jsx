// app/cws/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { notFound } from "next/navigation";
import NextDynamic from "next/dynamic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = NextDynamic(
  () => import("@/components/HyvorComments"),
  { ssr: false }
);

export default async function CwsEntryPage({ params }) {
  const slug = params?.slug;
  if (!slug) return notFound();

  const path = `content/cws/${encodeURIComponent(slug)}.md`;

  try {
    const file = await getFile(path);
    if (!file) return notFound();

    const md = Buffer.from(file.contentBase64, "base64").toString("utf8");
    const { content, data } = matter(md);
    const title = data?.title || slug.replace(/-/g, " ");
    const date = data?.date ? new Date(data.date) : null;

    return (
      <div className="container mx-auto max-w-3xl py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">{title}</h1>
          <Link
            href="/cws"
            className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10"
          >
            ← Weekly Recaps
          </Link>
        </div>

        {date && (
          <p className="text-sm text-white/60 mb-4">
            {date.toLocaleDateString()}
          </p>
        )}

        <article className="prose prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>

        <div className="mt-10">
          <HyvorComments pageId={`cws/${slug}`} />
        </div>
      </div>
    );
  } catch {
    return notFound();
  }
}
