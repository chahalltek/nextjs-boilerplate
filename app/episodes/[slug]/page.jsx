import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllEpisodes, getEpisodeBySlug } from "@/lib/episodes";
import EpisodePlayer from "@/components/EpisodePlayer";

export async function generateStaticParams() {
  const episodes = await getAllEpisodes();
  return episodes.map((ep) => ({ slug: ep.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const episode = await getEpisodeBySlug(params.slug);
  if (!episode) return {};
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const og = `${base}/api/og?title=${encodeURIComponent(episode.title)}&cover=${encodeURIComponent(episode.coverImage || "")}`;
  return {
    title: episode.title,
    description: episode.description,
    alternates: { canonical: `/episodes/${episode.slug}` },
    openGraph: {
      title: episode.title,
      description: episode.description,
      images: [og],
    },
    twitter: {
      card: "summary_large_image",
      title: episode.title,
      description: episode.description,
      images: [og],
    },
  };
}

export default async function EpisodePage({ params }: { params: { slug: string } }) {
  const episode = await getEpisodeBySlug(params.slug);
  if (!episode) return notFound();

  return (
    <div className="container py-12 space-y-6">
      <h1 className="text-3xl font-bold">{episode.title}</h1>
      <p className="text-white/70">{episode.description}</p>
      {episode.audio ? (
        <EpisodePlayer src={episode.audio} slug={episode.slug} title={episode.title} />
      ) : (
        <div className="text-white/60">Audio coming soon.</div>
      )}
      {episode.notes && (
        <ul className="list-disc pl-5 space-y-1 text-white/80">
          {episode.notes.map((n: string) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
app/episodes/page.jsx
