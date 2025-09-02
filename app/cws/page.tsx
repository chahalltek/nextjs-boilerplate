// app/cws/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import matter from "gray-matter";
import NflScheduleTicker from "@/components/NflScheduleTicker";
import { listDir, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Weekly Recap — Hey Skol Sister",
  description:
    "Coulda, Woulda, Shoulda: weekly fantasy recaps, lessons learned, and community reactions.",
  alternates: { types: { "application/rss+xml": "/cws/rss" } },
};

const DIR = "content/recaps";
const b64 = (s?: string) => Buffer.from(s || "", "base64").toString("utf8");

function toTime(dateStr?: string) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (!isNaN(d as any)) return d.getTime();
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return 0;
}

type Recap = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  html: string; // pre-rendered HTML (admin-preview style)
};

// --- Minimal, admin-style Markdown -> HTML renderer --------------------
function renderRecapHtml(md: string): string {
  // normalize line endings & spaces
  const lines = md.replace(/\r/g, "").replace(/\u00A0/g, " ").split("\n");

  const out: string[] = [];
  let i = 0;

  const closeList = () => {
    if (state.currentList) {
      out.push(state.currentList === "ol-num"
        ? "</ol>"
        : state.currentList === "ol-alpha"
        ? "</ol>"
        : "</ul>");
      state.currentList = null;
    }
  };

  const state: { currentList: "ol-num" | "ol-alpha" | "ul" | null } = {
    currentList: null,
  };

  const isH1 = (s: string) => /^#\s+/.test(s);
  const isH2 = (s: string) => /^##\s+/.test(s);
  const isH3 = (s: string) => /^###\s+/.test(s);

  const isNum = (s: string) => /^\s*\d+\.\s+/.test(s);
  const isAlpha = (s: string) => /^\s*[a-z]\.\s*$/i.test(s) || /^\s*[a-z]\.\s+/.test(s);
  const isBullet = (s: string) => /^\s*[-*+]\s+/.test(s);

  const pullItem = (startIndex: number, type: "num" | "alpha" | "bullet") => {
    // Grab continuation lines until we hit the next item (of any list type) or a hard break
    const items: string[] = [];
    let j = startIndex;

    // get first line text (strip marker if inline)
    const first = lines[j];
    let text = first;
    if (type === "num") text = text.replace(/^\s*\d+\.\s+/, "");
    else if (type === "alpha") text = text.replace(/^\s*[a-z]\.\s*/i, "");
    else text = text.replace(/^\s*[-*+]\s+/, "");
    items.push(text);
    j++;

    // collect continuation lines (wrapped paragraphs) until next marker / blank-blank boundary
    while (j < lines.length) {
      const l = lines[j];

      // new list item starts -> stop
      if (isNum(l) || isBullet(l) || isAlpha(l)) break;

      // two blank lines -> paragraph boundary outside list
      if (l.trim() === "" && j + 1 < lines.length && lines[j + 1].trim() === "") break;

      // single blank line inside this item -> keep as paragraph separator token
      items.push(l);
      j++;
    }

    // collapse soft wraps inside paragraphs but preserve empty lines as <p> breaks
    const html = items
      .join("\n")
      .replace(/[ \t]+$/gm, "")
      .split(/\n{2,}/) // paragraphs within the item
      .map((p) => `<p>${p.replace(/\n/g, " ").trim()}</p>`)
      .join("");

    return { html, next: j };
  };

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (isH1(line)) {
      closeList();
      out.push(`<h1 class="text-xl font-semibold mb-2">${line.replace(/^#\s+/, "")}</h1>`);
      i++; continue;
    }
    if (isH2(line)) {
      closeList();
      out.push(`<h2 class="text-lg font-semibold mt-4 mb-2">${line.replace(/^##\s+/, "")}</h2>`);
      i++; continue;
    }
    if (isH3(line)) {
      closeList();
      out.push(`<h3 class="font-semibold mt-3 mb-1">${line.replace(/^###\s+/, "")}</h3>`);
      i++; continue;
    }

    // Alpha list (a., b., ...) — marker may be alone on its own line
    if (isAlpha(line)) {
      if (state.currentList !== "ol-alpha") {
        closeList();
        out.push('<ol type="a" class="[list-style-type:lower-alpha] list-inside ml-5 space-y-1">');
        state.currentList = "ol-alpha";
      }
      const { html, next } = pullItem(i, "alpha");
      out.push(`<li>${html}</li>`);
      i = next; continue;
    }

    // Numbered list
    if (isNum(line)) {
      if (state.currentList !== "ol-num") {
        closeList();
        out.push('<ol class="list-inside ml-5 space-y-1">');
        state.currentList = "ol-num";
      }
      const { html, next } = pullItem(i, "num");
      out.push(`<li>${html}</li>`);
      i = next; continue;
    }

    // Bulleted list
    if (isBullet(line)) {
      if (state.currentList !== "ul") {
        closeList();
        out.push('<ul class="list-disc list-inside ml-5 space-y-1">');
        state.currentList = "ul";
      }
      const { html, next } = pullItem(i, "bullet");
      out.push(`<li>${html}</li>`);
      i = next; continue;
    }

    // Blank line
    if (line.trim() === "") {
      closeList();
      // collapse multiple blanks to one <br> gap
      if (out.length && out[out.length - 1] !== "<br/>") out.push("<br/>");
      i++; continue;
    }

    // Plain paragraph (collapse soft wraps until a blank line or a marker)
    closeList();
    const paras: string[] = [line];
    let j = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      if (l.trim() === "") break;
      if (isNum(l) || isBullet(l) || isAlpha(l) || isH1(l) || isH2(l) || isH3(l)) break;
      paras.push(l);
      j++;
    }
    out.push(
      `<p class="opacity-80">${paras.join("\n").replace(/\n/g, " ").trim()}</p>`
    );
    i = j;
  }

  closeList();
  return out.join("\n");
}
// ----------------------------------------------------------------------

async function fetchPublishedRecaps(): Promise<Recap[]> {
  const items = await listDir(DIR).catch(() => []);
  const files = items.filter((it: any) => it.type === "file" && /\.mdx?$/i.test(it.name));

  const recaps: Recap[] = [];
  for (const f of files) {
    const file = await getFile(f.path).catch(() => null as any);
    if (!file?.contentBase64) continue;

    const raw = b64(file.contentBase64);
    const parsed = matter(raw);
    const fm = (parsed.data as any) || {};

    const draft =
      fm.draft === true || String(fm.draft ?? "").trim().toLowerCase() === "true";
    const publishedStr = String(fm.published ?? fm.active ?? "true").toLowerCase();
    const visible = !["false", "0", "no"].includes(publishedStr);
    const publishAt = fm.publishAt ? new Date(fm.publishAt) : null;
    const scheduledInFuture = publishAt && Date.now() < publishAt.getTime();
    if (draft || !visible || scheduledInFuture) continue;

    recaps.push({
      slug: f.name.replace(/\.(md|mdx)$/i, ""),
      title: fm.title || f.name.replace(/\.(md|mdx)$/i, ""),
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      html: renderRecapHtml(parsed.content || ""),
    });
  }

  recaps.sort((a, b) => toTime(b.date) - toTime(a.date));
  return recaps;
}

function RssBadge() {
  const RSS_PATH =
    "M6 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-4-7a1 1 0 0 1 1-1c6.075 0 11 4.925 11 11a1 1 0 1 1-2 0 9 9 0 0 0-9-9 1 1 0 0 1-1-1Zm0-5a1 1 0 0 1 1-1C13.956 5 21 12.044 21 21a1 1 0 1 1-2 0C19 13.82 12.18 7 4 7a1 1 0 0 1-1-1Z";
  return (
    <Link
      href="/cws/rss"
      title="RSS feed"
      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white hover:bg-white/10"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d={RSS_PATH} />
      </svg>
      RSS
    </Link>
  );
}

function CwsExplainer() {
  return (
    <section className="card p-6 mb-8">
      <h2 className="text-xl font-bold mb-3">What is “Weekly Recap” (aka CWS)?</h2>
      <p className="text-white/80">
        CWS stands for <em>Coulda, Woulda, Shoulda</em> — the spiritual cousin of Survivor
        confessionals and the official diary of fantasy football regret.
      </p>
      <div className="mt-5 space-y-6 text-white/80">
        <div>
          <p className="font-semibold">How to play along</p>
          <div className="h-2" />
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li>
              <strong>Step 1:</strong> Set your lineup with confidence. (What could go wrong?)
            </li>
            <li>
              <strong>Step 2:</strong> Watch your bench casually drop 38. (We’ve all been there.)
            </li>
            <li>
              <strong>Step 3:</strong> Post your recap: what happened, your bold takes, and the{" "}
              <em>one tiny decision</em> that changed everything.
            </li>
            <li>
              <strong>Step 4:</strong> React to others with empathy, stats, memes, and kicker therapy.
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">House rules</p>
          <div className="h-2" />
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li>Be kind. We’re here to laugh, learn, and commiserate — not blindside each other.</li>
            <li>Screenshots welcome. Bonus points for dramatic “before/after”.</li>
            <li>Ties are broken by the best GIF, the spiciest stat, or the most creative “shoulda.”</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default async function CwsIndexPage() {
  const recaps = await fetchPublishedRecaps();
  const [latest, ...older] = recaps;

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <p className="text-center text-sm text-white/60">NFL schedule this week</p>
        <NflScheduleTicker />
      </div>

      <div className="max-w-5xl mx-auto py-10 space-y-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Weekly Recap</h1>
          <RssBadge />
        </div>

        {!latest ? (
          <>
            <div className="text-white/70">No recaps yet. Check back soon!</div>
            <CwsExplainer />
          </>
        ) : (
          <>
            <article className="card p-5 space-y-3">
              <div className="text-sm text-white/60">{latest.date}</div>
              <h2 className="text-xl font-semibold">{latest.title}</h2>
              {latest.excerpt && <p className="text-white/80">{latest.excerpt}</p>}
              <div
                className="prose prose-invert max-w-none [&_ol]:list-inside [&_ol]:ml-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:ml-5 [&_ul]:space-y-1 [&_li>p]:my-1"
                dangerouslySetInnerHTML={{ __html: latest.html }}
              />
              <div>
                <Link
                  href={`/cws/${encodeURIComponent(latest.slug)}`}
                  className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
                >
                  Open comments & reactions →
                </Link>
              </div>
            </article>

            <CwsExplainer />

            {older.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Previous Weeks</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {older.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/cws/${encodeURIComponent(r.slug)}`}
                      className="card p-4 block hover:bg-white/5"
                    >
                      <div className="text-xs text-white/50">{r.date}</div>
                      <div className="font-medium">{r.title}</div>
                      {r.excerpt && <div className="text-sm text-white/70 mt-1">{r.excerpt}</div>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
