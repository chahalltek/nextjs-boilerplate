import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllEpisodes, getEpisodeBySlug } from "@/lib/episodes";
import Image from "next/image";
import dynamic from "next/dynamic";
import EpisodeSearch from "@/components/EpisodeSearch";

const EpisodePlayer = dynamic(() => import("@/components/EpisodePlayer"), { ssr: false });

export async function generateStaticParams() {
  const episodes = await getAllEpisodes();
  return episodes.map((ep) => ({ slug: ep.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const episode = await getEpisodeBySlug(params.slug);
  if (!episode) return {};
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const og = `${base}/api/og?title=${encodeURIComponent(episode.title)}&cover=${encodeURIComponent(
    (episode as any).coverImage || ""
  )}`;
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
  if (!episode) notFound();

  // Safe reads for optional / variant fields
  const ep: any = episode as any;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  const datePublished: string | undefined = ep.publishedAt ?? ep.date ?? undefined;
  const durSec: number | undefined =
    typeof ep.durationSec === "number"
      ? ep.durationSec
      : typeof ep.duration === "number"
      ? ep.duration
      : undefined;
  const episodeNumber: number | undefined = ep.episodeNumber ?? undefined;
  const audioUrl: string | undefined = ep.audioUrl ?? ep.audio ?? undefined;
  const coverImage: string | undefined = ep.coverImage ?? undefined;

  const episodes = await getAllEpisodes();
  const tags: string[] = Array.from(new Set(episodes.flatMap((e: any) => e.tags || [])));

  const ld = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    url: `${baseUrl}/episodes/${episode.slug}`,
    datePublished,
    partOfSeries: { "@type": "PodcastSeries", name: "Hey Skol Sister" },
    duration: durSec ? `PT${Math.round(durSec / 60)}M` : undefined,
    episodeNumber,
    description: episode.description,
    author: episode.guests?.map((g: any) => ({ "@type": "Person", name: g.name })),
    associatedMedia: {
      "@type": "AudioObject",
      contentUrl: audioUrl,
    },
    keywords: (episode.tags || []).join(", "),
  };

  return (
    <div className="container py-12 space-y-6">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      {coverImage && (
        <Image
          src={coverImage}
          alt={episode.title}
          priority
          width={1600}
          height={900}
          sizes="(max-width: 768px) 100vw, 1200px"
          className="w-full h-auto rounded-xl"
        />
      )}
      <h1 className="text-3xl font-bold">{episode.title}</h1>
      <p className="text-white/70">{episode.description}</p>

      {audioUrl ? (
        <EpisodePlayer src={audioUrl} slug={episode.slug} title={episode.title} />
      ) : (
        <div className="text-white/60">Audio coming soon.</div>
      )}

      {Array.isArray(ep.notes) && ep.notes.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 text-white/80">
          {ep.notes.map((n: string) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <EpisodeSearch tags={tags} />
    </div>
  );
}
