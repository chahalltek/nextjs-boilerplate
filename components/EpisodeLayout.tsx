'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export type Episode = {
  slug: string;
  title: string;
  description: string;
  audioUrl?: string;
  externalPlayerEmbedHtml?: string;
  publishedAt: string;
  durationSec?: number;
  tags?: string[];
  guests?: {
    name: string;
    title?: string;
    avatarUrl?: string;
    bio?: string;
    link?: string;
  }[];
  showNotesHtml?: string;
  chapters?: { label: string; timeSec: number }[];
  related?: { title: string; slug: string }[];
  coverImage?: string;
  transcriptHtml?: string;
};

interface Props {
  episode: Episode;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function EpisodeLayout({ episode }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  };

  useEffect(() => {
    if (!showTranscript) return;
    const el = transcriptRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const time = target.getAttribute('data-time');
      if (time) {
        e.preventDefault();
        seek(parseFloat(time));
      }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [showTranscript]);

  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{episode.title}</h1>
        <p className="mt-2 text-white/70">{episode.description}</p>
      </header>

      {episode.audioUrl ? (
        <audio
          ref={audioRef}
          controls
          className="w-full"
          src={episode.audioUrl}
        />
      ) : episode.externalPlayerEmbedHtml ? (
        <div
          className="w-full"
          dangerouslySetInnerHTML={{
            __html: episode.externalPlayerEmbedHtml,
          }}
        />
      ) : null}

      {episode.showNotesHtml && (
        <section aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="text-2xl font-semibold mb-3">
            Show notes
          </h2>
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: episode.showNotesHtml }}
          />
        </section>
      )}

      {episode.chapters && episode.chapters.length > 0 && (
        <section aria-labelledby="chapters-heading" className="space-y-2">
          <h2 id="chapters-heading" className="text-2xl font-semibold">
            Timestamps
          </h2>
          <ul className="space-y-1">
            {episode.chapters.map((c) => (
              <li key={c.timeSec}>
                <button
                  className="text-sky-400 hover:underline"
                  onClick={() => seek(c.timeSec)}
                >
                  [{formatTime(c.timeSec)}] {c.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {episode.guests && episode.guests.length > 0 && (
        <section aria-labelledby="guests-heading" className="space-y-4">
          <h2 id="guests-heading" className="text-2xl font-semibold">
            Guests
          </h2>
          <ul className="space-y-4">
            {episode.guests.map((g) => (
              <li key={g.name} className="flex gap-4">
                {g.avatarUrl && (
                  <img
                    src={g.avatarUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">
                    {g.link ? (
                      <a
                        href={g.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {g.name}
                      </a>
                    ) : (
                      g.name
                    )}
                  </p>
                  {g.title && <p className="text-sm text-white/70">{g.title}</p>}
                  {g.bio && <p className="mt-1 text-sm text-white/80">{g.bio}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {episode.related && episode.related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-semibold mb-3">
            Related episodes
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            {episode.related.slice(0, 3).map((r) => (
              <li key={r.slug}>
                <Link href={`/episodes/${r.slug}`} className="text-sky-400 hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="transcript-heading" itemProp="transcript">
        <div className="flex items-center justify-between">
          <h2 id="transcript-heading" className="text-2xl font-semibold">
            Transcript
          </h2>
          {episode.transcriptHtml && (
            <button
              className="text-sm text-sky-400 hover:underline"
              onClick={() => setShowTranscript((v) => !v)}
              aria-expanded={showTranscript}
            >
              {showTranscript ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {episode.transcriptHtml ? (
          showTranscript ? (
            <div
              ref={transcriptRef}
              className="prose prose-invert mt-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: episode.transcriptHtml }}
            />
          ) : (
            <p className="mt-2 text-white/70">Transcript hidden</p>
          )
        ) : (
          <p className="mt-2 text-white/70">Transcript coming soon.</p>
        )}
      </section>
    </article>
  );
}
