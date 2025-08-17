// app/holdem-foldem/[slug]/page.jsx
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = dynamic(() => import("@/components/HyvorComments"), { ssr: false });
const DIR = "content/holdem";

function normTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

export default async function HoldemDetailPage({ params }) {
  const slug = params.slug;
  const file = await getFile(`${DIR}/${slug}.md`);
  if (!file?.contentBase64) return notFound();

  const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
  const parsed = matter(raw);
  const fm = parsed.data || {};
  if (!fm.published) return notFound();

  const tags = normTags(fm.tags);
  const canonical = `https://www.theskolsisters.com/holdem-foldem/${encodeURIComponent(slug)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title || slug,
    datePublished: fm.date || undefined,
    dateModified: fm.date || undefined,
    description: fm.excerpt || undefined,
    keywords: tags.join(", "),
    mainEntityOfPage: canonical,
  };

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="text-sm text-white/60">{fm.date}</div>
      <h1 className="text-3xl font-bold">{fm.title || slug}</h1>
      {fm.excerpt && <p className="text-white/80">{fm.excerpt}</p>}

      {tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t}>
              <Link href={`/tags/${encodeURIComponent(t)}`} className="text-xs rounded-full border border-white/20 px-2 py-0.5 text-white/70 hover:text-white">
                #{t}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <article className="prose prose-invert max-w-none">
        <ReactMarkdown>{parsed.content || ""}</ReactMarkdown>
      </article>

      <HyvorComments pageId={`holdem:${slug}`} />
    </div>
  );
}
