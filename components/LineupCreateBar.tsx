// components/LineupCreateBar.tsx (or wherever your button lives)
"use client";

import { useState } from "react";

export default function LineupCreateBar({
  email,
  teamName,
  sendWeekly,
  rules,      // { qb, rb, wr, te, flex, dst, k, scoring }
  players,    // [{ id, name, team, pos, isFlex? }, ...]
}: {
  email: string;
  teamName: string;
  sendWeekly: boolean;
  rules: {
    qb: number; rb: number; wr: number; te: number; flex: number; dst: number; k: number;
    scoring: "PPR" | "HALF_PPR" | "STD";
  };
  players: Array<{ id: string; name: string; team: string; pos: string; isFlex?: boolean }>;
}) {
  const [status, setStatus] = useState<"idle"|"sending"|"ok"|"error">("idle");
  const [msg, setMsg] = useState("");

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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStatus("ok");
      setMsg("✅ Roster created — check your email!");
    } catch (err: any) {
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
        {status === "sending" ? "Creating…" : "Create Roster"}
      </button>
      {msg && <span className="text-sm">{msg}</span>}
    </form>
  );
}
