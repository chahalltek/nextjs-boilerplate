// app/holdem-foldem/page.jsx
import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import nextDynamic from "next/dynamic";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HyvorComments = nextDynamic(() => import("@/components/HyvorComments"), { ssr: false });

export const metadata = {
  title: "Hold ’em / Fold ’em — Hey Skol Sister",
  description:
    "Weekly stash-or-trash advice with a dash of sass. Who to hold, who to fold, and why your bench is crying.",
};

const DIR = "content/holdfold";

async function loadAll() {
  const entries = await listDir(DIR); // [{name, path, type, sha, size}...]
  const files = entries
    .filter((e) => e.type === "file" && e.name.endsWith(".md"))
    .map((e) => e.path);

  const result = [];
  for (const path of files) {
    const file = await getFile(path);
    if (!file) continue;
    const buf = Buffer.from(file.contentBase64, "base64");
    const { content, data } = matter(buf.toString("utf8"));
    const slug = path.split("/").pop().replace(/\.md$/, "");
    result.push({
      slug,
      title: data.title || slug.replace(/-/g, " "),
      date: data.date || null,
      content,
    });
  }

  // newest first (by date if present, otherwise filename)
  result.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da || b.slug.localeCompare(a.slug);
  });

  return result;
}

export default async function HoldFoldIndexPage() {
  const posts = await loadAll();
  const latest = posts[0];
  const older = posts.slice(1);

  return (
    <div className="container max-w-5xl py-10 space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Hold ’em / Fold ’em</h1>
        <p className="text-white/70 max-w-2xl">
          Welcome to the weekly stash-or-trash rodeo. We tell you who to{" "}
          <span className="font-semibold">hold</span> (stay patient, greatness
          pending) and who to <span className="font-semibold">fold</span> (let it
          go like a bad karaoke night). It’s Survivor energy meets fantasy football
          pragmatism—with fewer torches and more waiver wire drama.
        </p>
      </header>

      {latest ? (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">{latest.title}</h2>
            {latest.date && (
              <div className="text-xs text-white/50">
                {new Date(latest.date).toLocaleDateString()}
              </div>
            )}
          </div>

          <article className="prose prose-invert max-w-none">
            <ReactMarkdown>{latest.content}</ReactMarkdown>
          </article>

          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <h3 className="text-lg font-semibold mb-1">Comments & Reactions</h3>
            <p className="text-white/60 text-sm mb-3">
              Agree? Disagree? Tell us who you’re holding or folding this week.
            </p>
            <HyvorComments pageId={`hef:${latest.slug}`} />
          </div>
        </section>
      ) : (
        <div className="text-white/60">No entries yet.</div>
      )}

      {older.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Previous Weeks</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {older.map((p) => (
              <Link
                key={p.slug}
                href={`/holdem-foldem/${p.slug}`}
                className="block rounded-lg border border-white/10 p-4 hover:bg-white/5"
              >
                <div className="font-semibold">{p.title}</div>
                {p.date && (
                  <div className="text-xs text-white/50">
                    {new Date(p.date).toLocaleDateString()}
                  </div>
                )}
                <div className="text-sm text-white/60 mt-2 line-clamp-3">
                  {/* tiny snippet from content */}
                  {p.content.replace(/\s+/g, " ").slice(0, 140)}…
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
