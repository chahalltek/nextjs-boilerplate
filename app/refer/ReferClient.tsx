// app/refer/ReferClient.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function ReferClient() {
  const params = useSearchParams();
  const code = params.get("ref") || params.get("code") || "";

  useEffect(() => {
    if (!code) return;
    try {
      localStorage.setItem("hss_ref", code);
    } catch {}
  }, [code]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.origin);
    url.pathname = "/";
    if (code) url.searchParams.set("ref", code);
    return url.toString();
  }, [code]);

  if (!code) {
    return (
      <div className="card p-4">
        <div className="text-sm text-white/70">
          No referral code found. Append <code>?ref=YOURCODE</code> to your links.
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="text-sm">
        <span className="text-white/60">Your referral code:</span>{" "}
        <code className="px-1 py-0.5 rounded bg-black/40 border border-white/10">{code}</code>
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1">Shareable link</label>
        <input
          className="input w-full"
          readOnly
          value={shareUrl}
          onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
        />
        <p className="text-xs text-white/50 mt-1">Click to select, then copy.</p>
      </div>
    </div>
  );
}
