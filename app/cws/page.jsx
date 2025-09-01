// app/cws/page.jsx
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

    // Accept either `published` or `active` flags (treat both the same)
    const publishedStr = String(fm.published ?? fm.active ?? "true").toLowerCase();
    const visible = !["false", "0", "no"].includes(publishedStr);

    // Scheduled publish time support
    const publishAt = fm.publishAt ? new Date(fm.publishAt) : null;
    const scheduledInFuture = publishAt && Date.now() < publishAt.getTime();

    if (draft || !visible || scheduledInFuture) continue;

    recaps.push({
      slug: f.name.replace(/\.(md|mdx)$/i, ""),
      title: fm.title || f.name.replace(/\.(md|mdx)$/i, ""),
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      content: parsed.content || "",
    });
  }

  recaps.sort((a, b) => toTime(b.date) - toTime(a.date));
  return recaps;
}

function RssBadge() {
  return (
    <Link
      href="/cws/rss"
      title="RSS feed"
      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm border border-white/20 text-white hover:bg-white/10"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M6 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-4-7a1 1 0 0 1 1-1c6.075 0 11 4.925 11 11a1 1 0 1 1-2 0 9 9 0 0 0-9-9 1 1 0 0 1-1-1Zm0-5a1 1 0 0 1 1-1C13.956 5 21 12.044 21 21a1 1 0 1 1-2 0C19 13.82 12.18 7 4 7a1 1 0 0 1-1-1Z" />
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
        CWS stands for <em>Coulda, Woulda, Shoulda</em> — the spiritual cousin of Survivor confessionals and the official diary of fantasy football regret.
      </p>
      <div className="mt-5 space-y-6 text-white/80">
        <div>
          <p className="font-semibold">How to play along</p>
          <div className="h-2" />
          <ul className="list-disc pl-5 mt-3 space-y-1">
            <li><strong>Step 1:</strong> Set your lineup with confidence. (What could go wrong?)</li>
            <li><strong>Step 2:</strong> Watch your bench casually drop 38. (We’ve all been there.)</li>
            <li><strong>Step 3:</strong> Post your recap: what happened, your bold takes, and the <em>one tiny decision</em> that changed everything.</li>
            <li><strong>Step 4:</strong> React to others with empathy, stats, memes, and kicker therapy.</li>
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

      <div className="ma
