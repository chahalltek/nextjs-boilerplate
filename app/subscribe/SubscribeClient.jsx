// app/subscribe/SubscribeClient.jsx
"use client";

import { useState } from "react";

export default function SubscribeClient() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      // The API route does the real work:
      // POST /api/subscribe { email, weeklyCoach: boolean }
      const weeklyCoach = (e.currentTarget.elements.namedItem("weeklyCoach")?.checked) || false;

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, weeklyCoach }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || "Subscribe failed");

      setMsg("✅ Thanks! Please check your email to confirm (if required).");
      setEmail("");
    } catch (err) {
      setMsg("❌ Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[minmax(260px,380px)_auto] items-start">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl bg-white/10 text-white px-4 py-3 border border-white/20 placeholder-white/50 focus:outline-none focus:border-white/50"
        aria-label="Email address"
      />

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center h-12 px-5 rounded-xl font-semibold
                   bg-[color:var(--skol-gold)] text-black
                   shadow-lg hover:brightness-110 active:brightness-95
                   active:translate-y-[1px] transition
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--skol-gold)] focus:ring-offset-[#0f0d18]
                   disabled:opacity-60"
        aria-label="Subscribe to updates"
      >
        {busy ? "Subscribing…" : "Subscribe"}
      </button>

      {/* helper row */}
      <div className="sm:col-span-2 text-sm text-white/70">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="weeklyCoach" className="scale-110 rounded" />
          Get my Skol Coach lineup by email each week
        </label>
      </div>

      {msg && <span className="sm:col-span-2 text-sm">{msg}</span>}
    </form>
  );
}
