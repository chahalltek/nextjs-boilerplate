// app/admin/polls/page.jsx
"use client";

import { useState } from "react";
import Link from "next/link";

export const runtime = "edge";

export default function AdminPollsPage() {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function setOptionAt(i, v) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }
  function addOption() {
    setOptions((prev) => (prev.length < 8 ? [...prev, ""] : prev));
  }
  function removeOption(i) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      const payload = {
        title: title.trim(),
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
        status,
      };

      const res = await fetch("/api/admin/polls", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Save failed");
      } else {
        setMsg("✅ Poll saved!");
      }
    } catch (err) {
      setMsg("Save failed (network error)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-12 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Polls (Admin)</h1>
        <Link href="/admin" className="underline text-white/80 hover:text-white">
          ← Back to Admin
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm text-white/70 mb-1">Title</label>
          <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Question</label>
          <textarea
            className="input w-full min-h-[100px]"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">Options (2–8)</label>
          <div className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={opt}
                  onChange={(e) => setOptionAt(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  required={i < 2}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="px-3 py-2 rounded border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-40"
                  disabled={options.length <= 2}
                  aria-label="Remove option"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="px-3 py-2 rounded border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-40"
              disabled={options.length >= 8}
            >
              + Add option
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-white/70">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-gold disabled:opacity-60">
            {saving ? "Saving…" : "Save Poll"}
          </button>
          {msg && <span className="text-sm text-white/80">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
