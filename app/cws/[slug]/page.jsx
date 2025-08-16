// app/cws/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Next routing flag (not the import)

const HyvorComments = nextDynamic(() => import("@/components/HyvorComments"), {
  ssr: false,
});

export default async function CwsEntryPage({ params }) {
  const { slug } = params || {};
  if (!slug) notFound();

  // Adjust this path if your admin writes to a different folder (e.g. "content/cws")
  const path = `content/recaps/${slug}.md`;

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
        <h2 className="text-xl font-semibold">Join the discussion</h2>
        <p className="text-white/60 text-sm">
          Share your own “Coulda, Woulda, Shoulda” from this week.
        </p>
        {/* Hyvor discussion keyed to this recap */}
        <HyvorComments pageId={`cws:${slug}`} />
      </section>
    </div>
  );
}
