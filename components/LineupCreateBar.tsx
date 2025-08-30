// components/LineupCreateBar.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rules = {
  qb: number; rb: number; wr: number; te: number; flex: number; dst: number; k: number;
  scoring: "PPR" | "HALF_PPR" | "STD";
};

export default function LineupCreateBar({
  email,
  teamName,
  sendWeekly,
  rules,
  players, // [{ id, name, team, pos, isFlex? }]
  successRedirect, // e.g. "/lineup/success"
}: {
  email: string;
  teamName: string;
  sendWeekly: boolean;
  rules: Rules;
  players: Array<{ id: string; name: string; team: string; pos: string; isFlex?: boolean }>;
  successRedirect?: string;
}) {
  const [status, setStatus] = useState<"idle"|"sending"|"ok"|"error">("idle");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMsg("");

    try {
      const res = await fetch("/api/lineup-lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, teamName, sendWeekly, rules, players }),
      });

      // read body safely no matter what
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw }; }

      if (!res.ok || !data?.ok) {
        const reason = data?.error || `${res.status} ${res.statusText}`;
        throw new Error(reason);
      }

      setStatus("ok");
      setMsg("✅ Roster created — check your email!");
      if (successRedirect) router.push(successRedirect);
    } catch (err: any) {
      console.error("[lineup-lab] create failed:", err);
      setStatus("error");
      setMsg(err?.message || "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleCreate} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[color:var(--skol-gold)] text-black font-semibold shadow-sm ring-1 ring-white/10 hover:shadow-md hover:brightness-105 active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--skol-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition"
      >
        {status === "sending" ? "Saving…" : "Create Roster"}
      </button>
      {msg && <span className="text-sm" aria-live="polite">{msg}</span>}
    </form>
  );
}
