// components/SubscribeCta.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tag?: string;              // e.g. "starter-pack", "survivor"
  source?: string;           // e.g. "/, /blog, /101"
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonLabel?: string;
  redirectToRefer?: boolean; // if true, go to /refer after success
  compact?: boolean;         // smaller style for sidebars
};

export default function SubscribeCta({
  tag = "starter-pack",
  source,
  title = "Skol Starter Pack",
  subtitle = "Fantasy made simple — get the one-page cheat sheet + weekly tips.",
  placeholder = "your@email.com",
  buttonLabel = "Get it",
  redirectToRefer = true,
  compact = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] =
    useState<{state:"idle"|"loading"|"ok"|"error"; msg?:string}>({ state: "idle" });
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ state: "loading" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, tag, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus({ state: "ok" });
      setEmail("");
      if (redirectToRefer && data.code) {
        router.push(`/refer?code=${encodeURIComponent(data.code)}`);
      }
    } catch (err: any) {
      setStatus({ state: "error", msg: err?.message || "Something went wrong" });
    }
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 ${compact ? "p-4" : "p-6"} space-y-3`}>
      <div>
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-sm text-white/70 mt-1">{subtitle}</div>}
      </div>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={status.state === "loading"}
          className="px-4 py-2 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {status.state === "loading" ? "Sending…" : buttonLabel}
        </button>
      </form>
      {status.state === "ok" && (
        <div className="text-sm text-emerald-400">Check your inbox 📬</div>
      )}
      {status.state === "error" && (
        <div className="text-sm text-rose-400">❌ {status.msg}</div>
      )}
      <div className="text-[11px] text-white/50">No spam. Unsubscribe anytime.</div>
    </div>
  );
}
