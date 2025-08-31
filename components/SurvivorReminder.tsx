// components/SurvivorReminder.tsx
"use client";

import { useState } from "react";

export default function SurvivorReminder() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"ok" | "err" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setDone(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "survivor-landing",
          topics: ["survivor-weekly"],  // <-- this is the key
        }),
      });
      if (!res.ok) throw new Error("bad");
      setDone("ok");
      setEmail("");
    } catch {
      setDone("err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
      <div>
        <div className="font-semibold">Survivor weekly recap</div>
        <p className="text-sm text-white/70">
          After each episode: <span className="font-medium">your score</span> + a link to the <span className="font-medium">leaderboard</span>.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-[220px] rounded-lg border border-white/20 bg-transparent px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-gold whitespace-nowrap"
        >
          {busy ? "Adding…" : "Get the recap"}
        </button>
      </div>
      {done === "ok" && (
        <div className="text-xs text-emerald-400 sm:col-span-2">Thanks! You’re on the list.</div>
      )}
      {done === "err" && (
        <div className="text-xs text-red-400 sm:col-span-2">Hmm, something went wrong. Try again?</div>
      )}
    </form>
  );
}
