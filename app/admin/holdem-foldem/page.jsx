"use client";

import { useState } from "react";

export default function HEFAdminPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<null | string>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving…");
    const res = await fetch("/api/hef/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Published!" : `Error: ${data?.error || "unknown"}`);
    if (res.ok) { setTitle(""); setBody(""); }
  }

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Hold ’em Fold ’em — Admin</h1>
        <p className="text-white/70">Publish this week’s post. The latest post becomes the live thread.</p>
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
          placeholder="Title"
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
