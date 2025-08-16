import React from "react";
import { notFound } from "next/navigation";
import { getFile } from "@/lib/github";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = dynamic(() => import("@/components/HyvorComments"), { ssr: false });

async function fetchRecap(slug) {
  const path = `content/recaps/${slug}.md`;
  const f = await getFile(path);
  if (!f?.contentBase64) return null;
  const text = Buffer.from(f.contentBase64, "base64").toString("utf8");
  return matter(text);
}

export default async function RecapPage({ params }) {
  const slug = params?.slug?.toString();
  const parsed = await fetchRecap(slug);
  if (!parsed) return notFound();

  const fm = parsed.data || {};
  const title = fm.title || slug;
  const date = fm.date || null;

  const pageId = `recap:${slug}`;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        {date && <div className="text-white/60 text-sm">{date}</div>}
      </header>

      <article className="prose prose-invert max-w-none">
        <ReactMarkdown>{parsed.content || ""}</ReactMarkdown>
      </article>

      {/* Comments & reactions */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold mb-3">Join the conversation</h2>
        <HyvorComments pageId={pageId} />
      </section>
    </div>
  );
}
