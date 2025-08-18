import React from "react";

const platforms = [
  { key: "apple", label: "Apple", env: "NEXT_PUBLIC_PODCAST_APPLE_URL" },
  { key: "spotify", label: "Spotify", env: "NEXT_PUBLIC_PODCAST_SPOTIFY_URL" },
  { key: "yt_music", label: "YouTube Music", env: "NEXT_PUBLIC_PODCAST_YT_MUSIC_URL" },
  { key: "amazon", label: "Amazon", env: "NEXT_PUBLIC_PODCAST_AMAZON_URL" },
  { key: "overcast", label: "Overcast", env: "NEXT_PUBLIC_PODCAST_OVERCAST_URL" },
  { key: "pocketcasts", label: "Pocket Casts", env: "NEXT_PUBLIC_PODCAST_POCKETCASTS_URL" },
];

interface Props {
  className?: string;
}

export default function ListenCtas({ className = "" }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {platforms.map((p) => {
        const href = process.env[p.env] || "#";
        return (
          <a
            key={p.key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Listen on ${p.label}`}
            data-analytics="listen_cta"
            data-platform={p.key}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {p.label}
          </a>
        );
      })}
    </div>
  );
}
