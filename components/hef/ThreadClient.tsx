"use client";

import { useEffect, useState } from "react";
import { HEF_EMOJI } from "@/lib/hef/store";

type APIThread = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export default function ThreadClient() {
  const [thread, setThread] = useState<APIThread | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [replies, setReplies] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const t = await fetch("/api/hef/thread", { cache: "no-store" }).then(r => r.json());
    setThread(t.thread);
    setReactions(t.reactions || {});
    if (t.thread?.id) {
      const rs = await fetch(`/api/hef/reply?threadId=${t.thread.id}`, { cache: "no-store" }).then(r => r.json());
      setReplies(rs.replies || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function react(emoji: string) {
    if (!thread) return;
    const res = await fetch("/api/hef/react", { method: "POST", body: JSON.stringify({ threadId: thread.id, emoji }) });
    const data = await res.json();
    if (data.reactions) setReactions(data.reactions);
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || !msg.trim()) return;
    await fetch("/api/hef/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.id, name, message: msg }),
    });
    setMsg("");
    await loadAll();
  }

  if (loading) return <div className="text-white/60">Loading…</div>;
  if (!thread) return <div className="text-white/60">No post yet. Check back soon!</div>;

  return (
    <div className="space-y-6">
      {/* Post */}
      <article className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60">{new Date(thread.createdAt).toLocaleString()}</div>
        <h2 className="mt-1 text-xl font-semibold">{thread.title}</h2>
        <p className="mt-2 whitespace-pre-wrap text-white/80">{thread.body}</p>
      </article>

      {/* Reactions */}
      <div className="flex flex-wrap gap-2">
        {HEF_EMOJI.map((e) => (
          <button
            key={e}
            onClick={() => react(e)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm hover:bg-white/[0.1]"
          >
            <span>{e}</span>
            <span className="text-white/70">{reactions?.[e] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Replies */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white/80">Replies</h3>

        <form onSubmit={submitReply} className="rounded-xl border border-white/10 p-3 bg-black/20 space-y-2">
          <input
            className="w-full rounded border border-white/10 bg-transparent px-3 py-2 text-sm"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="w-full rounded border border-white/10 bg-transparent px-3 py-2 text-sm"
            placeholder="Add your take…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={3}
            required
          />
          <div className="flex">
            <button className="ml-auto btn-gold px-4 py-2 rounded-xl">Post reply</button>
          </div>
        </form>

        <div className="space-y-2">
          {replies.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">
                <span className="font-medium">{r.name || "Anonymous"}</span> • {new Date(r.createdAt).toLocaleString()}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{r.message}</div>
            </div>
          ))}
          {replies.length === 0 && <div className="text-sm text-white/60">Be the first to reply.</div>}
        </div>
      </section>
    </div>
  );
}
