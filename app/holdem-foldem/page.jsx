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
    "Fantasy football stash-or-trash advice: injuries, usage trends, upcoming matchups, and when it’s time to let go.",
};

const DIR = "content/holdfold";

async function loadAll() {
  const entries = await listDir(DIR);
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

  // newest first (by date if present, else filename)
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
          Weekly fantasy football reality check. We weigh{" "}
          <span className="font-semibold">injuries</span>,{" "}
          <span className="font-semibold">usage & snap share</span>,{" "}
          <span className="font-semibold">upcoming matchups</span>, and good old{" "}
          <span className="font-semibold">“trust your eyes”</span> to decide who to{" "}
          <span className="font-semibold">hold</span> (patience!) and who to{" "}
          <span className="font-semibold">fold</span> (free the roster spot).
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 p-4 bg-white/5">
            <div className="text-sm font-semibold mb-1">Injuries & Role</div>
            <p className="text-sm text-white/70">
              If a player’s role is shrinking (or they’re not right physically), the name
              on the jersey can’t save your matchup.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 p-4 bg-white/5">
            <div className="text-sm font-semibold mb-1">Matchups & Schedule</div>
            <p className="text-sm text-white/70">
              We consider defensive tendencies and short-term schedules (bye weeks count!).
            </p>
          </div>
          <div className="rounded-lg border border-white/10 p-4 bg-white/5">
            <div className="text-sm font-semibold mb-1">When to Let Go</div>
            <p className="text-sm text-white/70">
              Draft capital is a sunk cost. If the data says bail, we say thanks for the
              memories and hit “Drop”.
            </p>
          </div>
        </div>
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

          <div id="comments" className="rounded-xl border border-white/10 p-4 bg-white/5">
            <h3 className="text-lg font-semibold mb-1">Comments & Reactions</h3>
            <p className="text-white/60 text-sm mb-3">
              Got a contrarian take? Drop it below—bonus points for injury/usage receipts.
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
