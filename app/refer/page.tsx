// app/refer/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";

export default function ReferPage() {
  const sp = useSearchParams();
  const code = sp.get("code") || "";
  const link = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "https://heyskolsister.com";
    return `${base}/?ref=${encodeURIComponent(code)}`;
  }, [code]);

  const shareText = encodeURIComponent(
    "I’m using Hey Skol Sister for beginner-friendly fantasy + survivor picks. Join me 👇"
  );

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <h1 className="text-2xl font-bold">Thanks for joining! 💜</h1>
      <p className="text-white/80">
        Share your link with 3 friends and get our Draft Day Buddy printable + a shout-out.
      </p>

      <div className="card p-4 space-y-3">
        <div className="text-sm text-white/70">Your referral link</div>
        <code className="block break-all p-3 rounded bg-black/40 border border-white/10">{link}</code>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            onClick={() => navigator.clipboard.writeText(link)}
          >
            Copy link
          </button>

          <a
            className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            href={`https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(link)}`}
            target="_blank" rel="noopener noreferrer"
          >Share WhatsApp</a>

          <a
            className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
            target="_blank" rel="noopener noreferrer"
          >Share Facebook</a>

          <a
            className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(link)}`}
            target="_blank" rel="noopener noreferrer"
          >Share X</a>

          <a
            className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            href={`mailto:?subject=Hey%20Skol%20Sister&body=${shareText}%0A%0A${encodeURIComponent(link)}`}
          >Share Email</a>
        </div>
      </div>

      <Link href="/" className="text-sm text-white/70 hover:opacity-80">← Back home</Link>
    </div>
  );
}
