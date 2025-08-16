// app/holdem-foldem/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = nextDynamic(() => import("@/components/HyvorComments"), { ssr: false });

const DIR = "content/holdfold";

export default async function HoldFoldEntryPage({ params }) {
  const { slug } = params || {};
  if (!slug) notFound();

  const path = `${DIR}/${slug}.md`;
  const file = await getFile(path);
  if (!file) notFound();

  const buf = Buffer.from(file.contentBase64, "base64");
  const { content, data } = matter(buf.toString("utf8"));

  const title = data.title || slug.replace(/-/g, " ");
  const date = data.date ? new Date(data.date).toLocaleDateString() : null;

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      {date && <div className="text-white/60 text-sm">{date}</div>}

      <article className="prose prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>

      <hr className="border-white/10" />

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Comments & Reactions</h2>
        <p className="text-white/60 text-sm">
          Drop your own hold/fold takes (bonus points for spicy-but-nice reasoning).
        </p>
        <HyvorComments pageId={`hef:${slug}`} />
      </section>
    </div>
  );
}
