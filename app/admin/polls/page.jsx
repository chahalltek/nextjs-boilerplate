"use client";

import { useState } from "react";

export default function AdminPollsPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function setOptionAt(i, val) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }
  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }
  function removeOption(i) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        title,
        slug,
        question,
        options: options.map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: include cookie for admin session
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`❌ Save failed (${res.status}) ${data?.error || ""}`);
      } else {
        setMsg("✅ Poll saved!");
      }
    } catch (err) {
      setMsg(`❌ ${String(err.message || err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Admin — Polls</h1>

      <div className="space-y-4">
        <label className="block">
          <div className="mb-1 text-sm text-white/70">Title</div>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Poll title…"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">Slug</div>
          <input
            className="input w-full"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-poll-slug"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">Question</div>
          <input
            className="input w-full"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Your question…"
          />
        </label>

        <div>
          <div className="mb-1 text-sm text-white/70">Options</div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={opt}
                  onChange={(e) => setOptionAt(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="px-3 py-2 rounded bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50"
                  disabled={options.length <= 2}
                  title="Remove option"
                >
                  −
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addOption}
            className="mt-3 px-3 py-2 rounded bg-white/10 border border-white/20 hover:bg-white/15"
          >
            + Add option
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Poll"}
          </button>
          {msg && (
            <span className={msg.startsWith("✅") ? "text-green-400" : "text-red-400"}>
              {msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
