import { notFound } from 'next/navigation';
import EpisodeLayout, { Episode } from '@/components/EpisodeLayout';
import episodes from '@/data/episodes.json';

type Params = { slug: string };

export function generateStaticParams() {
  return (episodes as Episode[]).map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: Params }) {
  const episode = (episodes as Episode[]).find((e) => e.slug === params.slug);
  if (!episode) return {};
  return {
    title: `${episode.title} — Hey Skol Sister`,
    description: episode.description,
    openGraph: {
      title: episode.title,
      description: episode.description,
      url: `/episodes/${episode.slug}`,
      images: episode.coverImage ? [episode.coverImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: episode.title,
      description: episode.description,
      images: episode.coverImage ? [episode.coverImage] : undefined,
    },
  };
}

export default function EpisodePage({ params }: { params: Params }) {
  const episode = (episodes as Episode[]).find((e) => e.slug === params.slug);
  if (!episode) notFound();

  const related = episode.tags
    ? (episodes as Episode[])
        .filter(
          (e) => e.slug !== episode.slug && e.tags?.some((t) => episode.tags?.includes(t))
        )
        .map((e) => ({ title: e.title, slug: e.slug }))
        .slice(0, 3)
    : [];

  return <EpisodeLayout episode={{ ...episode, related }} />;
}

