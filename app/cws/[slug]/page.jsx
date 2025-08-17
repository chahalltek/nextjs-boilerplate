// app/cws/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import nextDynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = nextDynamic(() => import("@/components/HyvorComments"), { ssr: false });
const DIR = "content/recaps";

export default async function CwsDetailPage({ params }) {
  const path = `${DIR}/${params.slug}.md`;
  const file = await getFile(path);
  if (!file?.contentBase64) return notFound();

  const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
  const parsed = matter(raw);
  const fm = parsed.data || {};
  if (!fm.published) return notFound();

  const pageId = `cws:${params.slug}`;

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <Link href="/cws" className="text-white/70 hover:text-white">← Back to Weekly Recap</Link>

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
