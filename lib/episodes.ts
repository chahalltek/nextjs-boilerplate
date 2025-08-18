import episodesData from "@/data/episodes.json";

export interface Episode {
  id: number;
  slug: string;
  title: string;
  teaser: string;
  description: string;
  date: string;
  audio: string;
  notes: string[];
  coverImage?: string;
  tags?: string[];
  guests?: { name: string; title?: string; avatarUrl?: string; bio?: string; link?: string }[];
}

const episodes: Episode[] = episodesData as Episode[];

export async function getAllEpisodes(): Promise<Episode[]> {
  return episodes;
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | undefined> {
  return episodes.find((e) => e.slug === slug);
}