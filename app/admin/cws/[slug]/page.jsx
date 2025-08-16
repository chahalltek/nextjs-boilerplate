// app/cws/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import nextDynamic from "next/dynamic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = nextDynamic(() => import("@/components/HyvorComments"), { ssr: false });

export default async function RecapDetailPage({ params }) {
  const slug = params?.slug;
  const path = `content/recaps/${slug}.md`;

  const file = await getFile(path);
  if (!file?.contentBase64) {
    return (
      <div className="container max-w-3xl py-10">
        <h1 className="text-2xl font-bold mb-2">Recap not found</h1>
        <Link href="/cws" className="text-white/70 hover:text-white">← Back to Weekly Recap</Link>
      </div>
    );
  }

  const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
  const parsed = matter(raw);
  const fm = parsed.data || {};

  if (!fm.published) {
    return (
      <div className="container max-w-3xl py-10">
        <h1 className="text-2xl font-bold mb-2">This recap is not published</h1>
        <Link href="/cws" className="text-white/70 hover:text-white">← Back to Weekly Recap</Link>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <Link
        href="/cws"
        className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
      >
        ← All recaps
      </Link>

      <article className="space-y-3">
        <div className="text-sm text-white/60">{fm.date}</div>
        <h1 className="text-2xl font-bold">{fm.title || slug}</h1>
        {fm.excerpt && <p className="text-white/80">{fm.excerpt}</p>}
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{parsed.content || ""}</ReactMarkdown>
        </div>
      </article>

      {/* Hyvor comments keyed to recap slug */}
      <div className="card p-4">
        <HyvorComments pageId={`/cws/${slug}`} />
      </div>
    </div>
  );
}
