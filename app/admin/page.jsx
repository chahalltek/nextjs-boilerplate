// app/admin/polls/page.jsx
"use client";

import React, { useMemo, useState } from "react";

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function PollAdminPage() {
  const [question, setQuestion] = useState("");
  const [slug, setSlug] = useState("");
  const [options, setOptions] = useState(["", ""]); // min 2
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [draft, setDraft] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const autoSlug = useMemo(() => slugify(question), [question]);

  function updateOption(i, value) {
    setOptions((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }
  function addOption() {
    setOptions((prev) => (prev.length >= 8 ? prev : [...prev, ""]));
  }
  function removeOption(i) {
    setOptions((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)
    );
  }

  async function onSave() {
    setSaving(true);
    setMsg("");

    try {
      const finalSlug = slug.trim() || autoSlug;
      if (!finalSlug) throw new Error("Please enter a slug or question");

      const cleaned = options.map((t) => t.trim()).filter(Boolean).slice(0, 8);
      if (cleaned.length < 2) throw new Error("Add at least two options");

      const payload = {
        slug: finalSlug,
        question: question.trim(),
        options: cleaned.map((text, i) => ({ id: i + 1, text })),
        status: draft ? "draft" : "active",
        openAt: openAt || null,
        closeAt: closeAt || null,
      };

      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin", // send admin cookie
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errText = data?.error ? `• ${data.error}` : "";
        throw new Error(`Save failed (${res.status}) ${errText}`);
      } else {
        setMsg("✅ Poll saved!");
      }
    } catch (err) {
      setMsg(`❌ ${err.message || "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Admin — Polls</h1>

      <label className="block text-sm text-white/70">Question</label>
      <input
        className="input w-full mt-1 mb-4"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Who should start at flex this week?"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/70">Slug</label>
          <input
            className="input w-full mt-1"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={autoSlug || "auto-from-question"}
          />
          <p className="text-xs text-white/50 mt-1">
            Final: <span className="font-mono">{slug.trim() || autoSlug || "…"}</span>
          </p>
        </div>

        <label className="inline-flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={draft}
            onChange={(e) => setDraft(e.target.checked)}
          />
          <span>Draft (hide from public)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm text-white/70">Opens</label>
          <input
            type="datetime-local"
            className="input w-full mt-1"
            value={openAt}
            onChange={(e) => setOpenAt(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-white/70">Closes</label>
          <input
            type="datetime-local"
            className="input w-full mt-1"
            value={closeAt}
            onChange={(e) => setCloseAt(e.target.value)}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-2">Options</h2>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input w-full"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
            />
            <button
              type="button"
              className="px-2 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/20"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              title={options.length <= 2 ? "At least two options required" : "Remove"}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-3 px-3 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/20"
        onClick={addOption}
        disabled={options.length >= 8}
      >
        + Add option
      </button>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white"
        >
          {saving ? "Saving…" : "Save Poll"}
        </button>
        {msg && <span className="text-sm text-white/70">{msg}</span>}
      </div>
    </div>
  );
}
