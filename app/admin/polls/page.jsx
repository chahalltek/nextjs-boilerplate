"use client";

import { useState } from "react";

export default function AdminPolls() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [msg, setMsg] = useState("");

  function setOption(i, v) {
    const next = options.slice();
    next[i] = v;
    setOptions(next);
  }

  async function onSave() {
    setMsg("Saving…");

    try {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        credentials: "include",                 // <<—— send admin cookie
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          question,
          options: options.filter(Boolean),
          active: true,
        }),
      });

      if (!res.ok) {
        let reason = "";
        try {
          const j = await res.json();
          reason = j?.error || j?.reason || "";
        } catch {}
        throw new Error(`${res.status} ${res.statusText} ${reason}`.trim());
      }

      setMsg("✅ Poll saved!");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg(`❌ Save failed (${String(err.message)})`);
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold mb-6">Admin — Polls</h1>

      <div className="grid gap-4 max-w-2xl">
        <label className="text-sm">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="text-sm">Slug</label>
        <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />

        <label className="text-sm">Question</label>
        <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} />

        <label className="text-sm mt-2">Options</label>
        <div className="grid gap-2">
          {options.map((opt, i) => (
            <input
              key={i}
              className="input"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20"
            onClick={() => setOptions((p) => [...p, ""])}
          >
            + Add option
          </button>
          <button className="btn-gold" type="button" onClick={onSave}>
            Save Poll
          </button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
