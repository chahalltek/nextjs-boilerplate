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
      // No server dependency required. Drop your real endpoint here later.
      await new Promise((r) => setTimeout(r, 400));
      setMsg("✅ Thanks! You’re on the list.");
      setEmail("");
    } catch {
      setMsg("❌ Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
    >
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full sm:w-96 rounded-xl bg-white/10 text-white px-4 py-3 border border-white/20 placeholder-white/50 focus:outline-none focus:border-white/40"
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center h-12 px-5 rounded-xl font-semibold bg-[color:var(--skol-gold)] text-black hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Notify me"}
      </button>

      {msg && <span className="text-sm sm:ml-2">{msg}</span>}
    </form>
  );
}
