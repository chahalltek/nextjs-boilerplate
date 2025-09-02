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
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "Subscription failed");
      }

      setMsg("✅ Thanks! Please check your email to confirm (if required).");
      setEmail("");
    } catch (err) {
      setMsg("❌ Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
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
          className="inline-flex items-center justify-center h-12 px-6 rounded-xl font-semibold text-white bg-[color:var(--skol-gold)] shadow-lg hover:brightness-110 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-60"
        >
          {busy ? "Subscribing…" : "Subscribe"}
        </button>
      </div>

      {/* Policy line only, no checkboxes */}
      <p className="text-sm text-white/70">
        By subscribing you agree to our{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </p>

      {msg && (
        <p className="text-sm" aria-live="polite">
          {msg}
        </p>
      )}
    </form>
  );
}
