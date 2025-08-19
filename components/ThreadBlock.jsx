"use client";

import { useEffect, useState } from "react";

export default function ThreadBlock({ apiBase = "/api/ss" }) {
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/thread`, { cache: "no-store" });
      const data = await res.json();
      setThread(data?.thread || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function sendReply(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${apiBase}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, threadId: thread?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setBody("");
        // optimistic: append newest to end
        setThread((t) => t ? { ...t, replies: [...(t.replies || []), data.reply] } : t);
      }
    } finally {
      setPosting(false);
    }
  }

  async function react(emoji) {
    // optimistic
    setThread((t) => t ? {
      ...t,
      reactions: { ...(t.reactions || {}), [emoji]: (t.reactions?.[emoji] || 0) + 1 }
    } : t);

    await fetch(`${apiBase}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, threadId: thread?.id }),
    }).catch(() => {});
  }

  if (loading) {
    return <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">Loading…</div>;
  }
  if (!thread) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
        No Start/Sit thread is live yet. Check back soon.
      </div>
    );
  }

  const reactions = thread.reactions || {};
  const buttons = ["👍","🔥","🤔"];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold">{thread.title}</h3>
        <p className="text-white/80 whitespace-pre-wrap">{thread.body}</p>
      </header>

      <div className="flex gap-2">
        {buttons.map((e) => (
          <button
            key={e}
            onClick={() => react(e)}
            className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10 text-sm"
            aria-label={`React ${e}`}
          >
            {e} <span className="opacity-70">{reactions[e] || 0}</span>
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h4 className="text-sm font-medium opacity-80">Replies</h4>
        <div className="grid gap-3">
          {(thread.replies || []).map((r) => (
            <article key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-sm font-semibold">{r.name || "Anonymous"}</div>
              <div className="text-sm text-white/80 whitespace-pre-wrap mt-1">{r.body}</div>
              <div className="text-xs text-white/50 mt-1">{new Date(r.createdAt).toLocaleString()}</div>
            </article>
          ))}
          {(!thread.replies || thread.replies.length === 0) && (
            <div className="text-sm text-white/60">Be the first to reply.</div>
          )}
        </div>

        <form onSubmit={sendReply} className="mt-2 grid gap-2">
          <input
            className="rounded border border-white/10 bg-transparent px-3 py-2"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="rounded border border-white/10 bg-transparent px-3 py-2"
            placeholder="Write a reply…"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <div>
            <button
              disabled={posting}
              className="btn-gold rounded-xl px-4 py-2 disabled:opacity-60"
            >
              {posting ? "Posting…" : "Post Reply"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
