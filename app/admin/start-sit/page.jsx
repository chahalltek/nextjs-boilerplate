export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { kv } from "@vercel/kv";

/** very small MD -> HTML (same as admin, server-side) */
function mdToHtml(md: string) {
  if (!md) return "";
  md = md.replace(/\r\n/g, "\n");
  md = md.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  md = md
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
  md = md.replace(/^\s*---+\s*$/gm, "<hr />");
  md = md.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
         .replace(/_(.+?)_/g, "<em>$1</em>")
         .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
  md = md.replace(/^(?:-\s+.*(?:\n|$))+?/gm, (block) => {
    const items = block.trim().split(/\n/)
      .map((line) => line.replace(/^-+\s+/, "").trim())
      .map((txt) => `<li>${txt}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });
  md = md
    .split(/\n{2,}/)
    .map((chunk) =>
      /^<(h\d|ul|hr)/i.test(chunk.trim()) ? chunk : `<p>${chunk.split("\n").join("<br />")}</p>`
    )
    .join("\n");
  return md;
}

async function getLiveThread() {
  const current: any = await kv.get("ss:current");
  if (!current?.id) return null;
  const thread: any = await kv.get(`ss:thread:${current.id}`);
  return thread ?? null;
}

export default async function StartSitPage() {
  const thread = await getLiveThread();

  return (
    <main className="container max-w-4xl py-8 space-y-6">
      <header>
        <h1 className="text-4xl font-bold">Start / Sit</h1>
        <p className="text-white/70">Latest injury report to help with your start/sit decisions.</p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-semibold mb-3">This Week’s Thread</h2>
        {!thread ? (
          <p className="text-white/70">No Start/Sit thread is live yet. Check back soon.</p>
        ) : (
          <>
            {thread.title && <h3 className="text-lg font-semibold mb-2">{thread.title}</h3>}
            <article
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: mdToHtml(thread.markdown || "") }}
            />
          </>
        )}
      </section>
    </main>
  );
}
