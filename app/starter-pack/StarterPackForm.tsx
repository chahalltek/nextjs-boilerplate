// app/starter-pack/StarterPackForm.tsx
"use client";

import { useState } from "react";

type Props = {
  tag?: string;
  source?: string;
  successRedirect?: string;
};

type Status = "idle" | "sending" | "ok" | "error";

export default function StarterPackForm({
  tag = "starter-pack",
  source = "starter-pack-page",
  successRedirect,
}: Props) {
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, tag, source }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setStatus("ok");
      setMsg("✅ Check your inbox for the Starter Pack!");
      if (successRedirect) window.location.href = successRedirect;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Something went wrong";
      setStatus("error");
      setMsg(message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <label className="block text-sm text-white/70">Email</label>
      <input
        type="email"
        required
        className="input w-full"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="px-4 py-2 rounded bg-[color:var(--skol-gold)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Email me the PDF"}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>

      <p className="text-xs text-white/50">
        We’ll send you the Starter Pack PDF and occasional tips. Unsubscribe anytime.
      </p>
    </form>
  );
}
