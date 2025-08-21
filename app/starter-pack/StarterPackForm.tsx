"use client";

import { useState } from "react";

type Props = {
  tag?: string;
  source?: string;
  successRedirect?: string;
};

type Status = "idle" | "sending" | "ok" | "error";

function isEmail(v: string) {
  return /\S+@\S+\.\S+/.test(v);
}

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
    if (!isEmail(email)) {
      setStatus("error");
      setMsg("Please enter a valid email.");
      return;
    }

    setStatus("sending");
    setMsg("");

    try {
      const res = await fetch("/api/starter-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tag, source }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

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
          className="
            inline-flex items-center gap-2
            px-5 py-2.5 rounded-xl
            bg-[color:var(--skol-gold)] text-white font-semibold
            shadow-sm ring-1 ring-white/10
            hover:shadow-md hover:brightness-105
            active:translate-y-[1px]
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-2
            focus-visible:ring-[color:var(--skol-gold)]
            focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            transition
            cursor-pointer
          "
        >
          {status === "sending" ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16v12H4z" />
                <path d="m22 7-10 7L2 7" />
              </svg>
              Email me the PDF
            </>
          )}
        </button>

        {msg && (
          <span className="text-sm" aria-live="polite">
            {msg}
          </span>
        )}
      </div>

      <p className="text-xs text-white/50">
        We’ll send you the Starter Pack PDF and occasional tips. Unsubscribe anytime.
      </p>
    </form>
  );
}
