// app/start-sit/page.jsx
import Link from "next/link";
import InjuryTicker from "@/components/InjuryTicker";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Start/Sit — Hey Skol Sister",
  description: "Weekly Start/Sit calls with injury updates and matchup notes.",
};

// Minimal Markdown -> HTML: paragraphs with blank-line spacing, lists, bold/italic, links, <br/> for single newlines
function mdToHtml(md = "") {
  if (!md) return "";
  md = md.replace(/\r\n/g, "\n");
  md = md.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  // headings
  md = md
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

  // horizontal rule
  md = md.replace(/^\s*---+\s*$/gm, "<hr />");

  // inline formatting (do before block splitting)
  md = md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);

  // simple bullet lists
  md = md.replace(/^(?:-\s+.*(?:\n|$))+?/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((line) => line.replace(/^-+\s+/, "").trim())
      .map((txt) => `<li>${txt}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // paragraphs with blank-line spacing; inside a paragraph, preserve single newlines as <br />
  const html = md
    .split(/\n{2,}/)
    .map((chunk) =>
      /^<(h\d|ul|hr)/i.test(chunk.trim())
        ? chunk
        : `<p>${chunk.split("\n").join("<br />")}</p>`
    )
    .join("\n");

  return html;
}

async function getLiveThread() {
  const current = await kv.get("ss:current"); // { id, week, title }
  const id = current?.id;
  if (!id) return null;
  const thread = await kv.get(`ss:thread:${id}`); // { id, key, title, markdown }
  return thread || null;
}

export default async function StartSitPage() {
  const thread = await getLiveThread();

  return (
    <div className="container py-12">
      {/* Injury ticker at very top */}
      <section className="mb-8">
        <InjuryTicker />
      </section>

      {/* Page header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Start / Sit</h1>
        <p className="mt-2 text-white/70">
          Latest injury report to help with your start/sit decisions.
        </p>
      </header>

      {/* Weekly thread */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">This Week’s Thread</h2>

        {!thread ? (
          <p className="text-white/70">No Start/Sit thread is live yet. Check back soon.</p>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            {thread.title && <h3 className="text-lg font-semibold mb-2">{thread.title}</h3>}
            <article
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: mdToHtml(thread.markdown || "") }}
            />
          </div>
        )}
      </section>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3">
        <Link href="/subscribe" className="btn-gold">
          Notify me when weekly picks drop
        </Link>
        <Link href="/101" className="cta-card">
          <span className="cta-title">Start with 101 → </span>
          <span className="cta-sub">New to fantasy? We got you.</span>
        </Link>
      </div>
    </div>
  );
}
