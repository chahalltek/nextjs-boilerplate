"use client";
import { useRef, useEffect } from "react";
import { track } from "@/lib/analytics";

interface Props {
  src: string;
  slug: string;
  title: string;
}

export default function EpisodePlayer({ src, slug, title }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const milestones = [0.1, 0.25, 0.5, 0.75, 0.95];
  const fired = useRef(new Set<number>());

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;

    const onPlay = () => track("episode_play", { slug, title });
    const onPause = () => track("episode_pause", { slug, currentTime: audio.currentTime });
    const onTime = () => {
      if (!audio.duration) return;
      const pct = audio.currentTime / audio.duration;
      milestones.forEach((m) => {
        if (pct >= m && !fired.current.has(m)) {
          fired.current.add(m);
          track("episode_progress", { slug, percent: m * 100 });
        }
      });
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [slug, title]);

  return <audio ref={ref} controls src={src} className="w-full" />;
}