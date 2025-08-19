"use client";

import { useState } from "react";

export default function StartSitAdminPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [key, setKey] = useState("");
  const [status, setStatus] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setStatus("Saving…");
    try {
      const res = await fetch("/api/ss/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setStatus("Published!");
      setTitle("");
      setBody("");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Start/Sit — Admin</h1>
        <p className="text-white/70">
          Publish this week’s Start/Sit post. The latest post becomes the live thread on the Start/Sit page.
        </p>
      </header>

      <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <input
          className="w-full rounded border border-white/10 bg-transparent px-3 py-2"
          placeholder="Admin secret (ADMIN_SECRET)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          type="password"
          required
        />
        <input
          className="w-full rounded border border-white/10 bg-transparent px-3 py-2"
          placeholder="Title (e.g., Week 3 Start/Sit)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full rounded border border-white/10 bg-transparent px-3 py-2"
          placeholder="Body (markdown or plain text)"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <div className="flex items-center gap-3">
          <button className="btn-gold px-4 py-2 rounded-xl">Publish</button>
          {status && <span className="text-sm text-white/70">{status}</span>}
        </div>
      </form>
    </main>
  );
}
