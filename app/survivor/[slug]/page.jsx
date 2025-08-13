import { notFound } from "next/navigation";
import { getPollBySlug, getAllSurvivorPolls } from "@/lib/survivorPolls";
import dynamic from "next/dynamic";

// Render embeds client-side only (so third-party scripts can run)
const EmbedHtml = dynamic(() => import("@/components/EmbedHtml"), { ssr: false });
// Keep your existing Disqus comments component:
const Comments = dynamic(() => import("@/components/CommentsEmbed"), { ssr: false });

export async function generateStaticParams() {
  return getAllSurvivorPolls().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const poll = getPollBySlug(params.slug);
  if (!poll) return { title: "Poll not found — Skol Sisters" };
  return { title: `${poll.title} — Survivor`, description: poll.excerpt || "" };
}

export default function SurvivorPollPage({ params }) {
  const poll = getPollBySlug(params.slug);
  if (!poll) return notFound();

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-semibold mb-2">{poll.title}</h1>
      {poll.date && <p className="text-white/60 mb-6">{new Date(poll.date).toLocaleDateString()}</p>}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-8">
        <EmbedHtml html={poll.embed} />
      </div>

      {poll.content && (
        <p className="text-white/80 mb-10 whitespace-pre-wrap">{poll.content}</p>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Comments</h2>
        <Comments
          identifier={`/survivor/${poll.slug}`}
          title={poll.title}
          url={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/survivor/${poll.slug}`}
        />
      </section>
    </div>
  );
}
