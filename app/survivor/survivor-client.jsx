"use client";

import { useEffect, useMemo, useState } from "react";
import Poll from "@/components/Poll";

const HYVOR_SITE_ID = Number(process.env.NEXT_PUBLIC_HYVOR_SITE_ID || 0);

export default function SurvivorClient({ polls, initialSlug }) {
  const [selected, setSelected] = useState(initialSlug || (polls[0]?.slug ?? null));

  // Load Hyvor only once
  useEffect(() => {
    if (!HYVOR_SITE_ID) return;
    if (document.getElementById("hyvor-talk-script")) return;

    window.HYVOR_TALK_WEBSITE = HYVOR_SITE_ID;
    window.HYVOR_TALK_CONFIG = { id: `poll:${selected}` };

    const s = document.createElement("script");
    s.src = "https://talk.hyvor.com/embed/embed.js";
    s.async = true;
    s.id = "hyvor-talk-script";
    document.body.appendChild(s);
  }, []);

  // On slug change, tell Hyvor to reload to new page id
  useEffect(() => {
    if (!HYVOR_SITE_ID) return;
    window.HYVOR_TALK_CONFIG = { id: `poll:${selected}` };
    if (window.HYVOR_TALK && typeof window.HYVOR_TALK.reload === "function") {
      window.HYVOR_TALK.reload();
    }
  }, [selected]);

  const ordered = useMemo(() => {
    const arr = [...polls];
    arr.sort((a, b) => (b.active - a.active) || a.slug.localeCompare(b.slug));
    return arr;
  }, [polls]);

  return (
    <div className="container max-w-5xl py-8">
      <h1 className="text-4xl font-bold mb-2">Survivor</h1>
      <p className="text-white/70 mb-6">Vote in the weekly poll and see live results.</p>

      {/* Poll picker */}
      <div className="mb-6">
        {ordered.length === 0 ? (
          <div className="text-white/60">No polls yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ordered.map((p) => (
              <button
                key={p.slug}
                onClick={() => setSelected(p.slug)}
                className={[
                  "px-3 py-1.5 rounded-xl border text-sm transition",
                  selected === p.slug
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-white/15 text-white/80 hover:text-white hover:border-white/30"
                ].join(" ")}
                title={p.question}
              >
                {p.active ? "⭐︎ " : ""}{p.slug}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Poll viewer */}
      {selected && <Poll slug={selected} />}

      {/* Hyvor thread */}
      {HYVOR_SITE_ID ? (
        <div className="mt-10">
          <div id="hyvor-talk-view"></div>
        </div>
      ) : null}
    </div>
  );
}
