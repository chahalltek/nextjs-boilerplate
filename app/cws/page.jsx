// app/cws/page.jsx
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import NflScheduleTicker from "@/components/NflScheduleTicker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Weekly Recap — Hey Skol Sister",
  description:
    "Coulda, Woulda, Shoulda: weekly fantasy recaps, lessons learned, and community reactions.",
  alternates: { types: { "application/rss+xml": "/cws/rss" } },
};

const DIR = "content/recaps";
const b64 = (s) => Buffer.from(s || "", "base64").toString("utf8");

function toTime(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.getTime();
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return 0;
}

async function fetchPublishedRecaps() {
  const items = await listDir(DIR).catch(() => []);
  const files = items.filter((it) => it.type === "file" && /\.mdx?$/i.test(it.name));

  const recaps = [];
  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;

    const raw = b64(file.contentBase64);
    const parsed = matter(raw);
    const fm = parsed.data || {};

    const draft =
      fm.draft === true ||
      String(fm.draft ?? "").trim().toLowerCase() === "true";

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
      content: normalizeMarkdown(parsed.content || ""),
    });
  }

  recaps.sort((a, b) => toTime(b.date) - toTime(a.date));
  return recaps;
}

/**
 * Match admin preview behavior:
 *  - Insert a blank line before "1. " / "-" / "*" / "+" so Markdown makes lists
 *  - Convert lettered blocks (a., b., …) into <ol type="a"> with <li> and keep
 *    the writer's line breaks via <p> and <br />
 *  - Works whether the marker is "a. text…" OR "a." on a line by itself
 */
function normalizeMarkdown(md) {
  const src = md.replace(/\r/g, "").replace(/\u00A0/g, " ");
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  let prevBlank = true;

  const isLetterMarker = (s) => /^\s*[a-z]\.\s*(.*)?$/i.test(s);

  const paragraphize = (text) =>
    text
      .replace(/[ \t]+$/gm, "")
      .split(/\n{2,}/)                     // paragraphs
      .map((p) => `<p>${p.replace(/\n/g, "<br />").trim()}</p>`)
      .join("");

  while (i < lines.length) {
    const line = lines[i];

    // Lettered list block
    if (isLetterMarker(line)) {
      if (!prevBlank) out.push("");
      out.push('<ol type="a" class="[list-style-type:lower-alpha] list-inside ml-5 space-y-1">');

      while (i < lines.length && isLetterMarker(lines[i])) {
        // Get the text after the marker on the same line (if any)
        const m = lines[i].match(/^\s*[a-z]\.\s*(.*)?$/i);
        let itemLines = [];
        if (m && m[1]) itemLines.push(m[1]); // inline text after "a."

        i++;

        // Accumulate continuation lines (including blanks) until next letter marker
        while (i < lines.length && !isLetterMarker(lines[i])) {
          // If we hit a brand-new numbered/bulleted list and we already grabbed content,
          // stop the current item (keeps semantics sane)
          if (
            itemLines.length > 0 &&
            (/^\s*\d+\.\s+/.test(lines[i]) || /^\s*[-*+]\s+/.test(lines[i]))
          ) break;

          itemLines.push(lines[i]);
          // If the next non-blank starts a new lettered item, break out cleanly
          let k = i + 1;
          while (k < lines.length && lines[k].trim() === "") k++;
          if (k < lines.length && isLetterMarker(lines[k])) {
            i = k;
            break;
          }
          i++;
        }

        const rawItem = itemLines.join("\n");
        out.push(`<li>${paragraphize(rawItem)}</li>`);
      }

      out.push("</ol>", "");
      prevBlank = true;
      continue;
    }

    // Ensure Markdown recognizes normal numeric/bullet lists
    const isStdItem = /^\s*\d+\.\s+/.test(line) || /^\s*[-*+]\s+/.test(line);
    if (isStdItem && !prevBlank) out.push("");

    out.push(line);
    prevBlank = line.trim() === "";
    i++;
  }

  return out.join("\n");
}

function RssBadge() {
  return (
    <Link
      href="/cws/rss"
      title="RSS feed"
      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white hover:bg-white/10"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M6 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-4-7a1 1 0 0 1 1-1c6.075 0 11 4.925 11 11a1 1 0 1 1-2 0 9 9 0 0 0-9-9 1 1 0 0 1-1-1Zm0-5a1 1
