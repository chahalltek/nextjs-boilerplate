"use client";

import { useState } from "react";
import Link from "next/link";

function emptyOption() {
  return { label: "" };
}

export default function AdminPollsPage() {
  const [slug, setSlug] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([emptyOption(), emptyOption()]);
  const [active, setActive] = useState(false);
  const [closesAt, setClosesAt] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function setOption(i, val) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, label: val } : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, emptyOption()]);
  }

  function removeOption(i) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onSave(e) {
    e.preventDefault();
    setMsg("");
    if (!slug.trim() || !question.trim()) {
      setMsg("❌ Please provide a slug and question.");
      return;
    }
    if (options.some((o) => !o.label.trim()) || options.length < 2) {
      setMsg("❌ Please provide at least two non-empty options.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          question,
          options,
          active,
          closesAt: closesAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/polls")}`;
          return;
        }
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setMsg("✅ Poll saved!");
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Polls — Create / Edit</h1>
        <Link
          href="/admin"
          className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10"
        >
          ← Admin Home
        </Link>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        <div className="card p-5">
          <label className="block text-sm text-white/70 mb-1">Slug</label>
          <input
            className="input w-full"
            placeholder="week-1-pickem"
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9\-]/g, "-")
                  .replace(/--+/g, "-")
              )
            }
          />
          <p className="text-xs text-white/50 mt-1">
            Files saved under <code>data/polls/&lt;slug&gt;.json</code>
          </p>
        </div>

        <div className="card p-5">
          <label className="block text-sm text-white/70 mb-1">Question</label>
          <input
            className="input w-full"
            placeholder="Who wins this week?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/70">Options</div>
            <button
              type="button"
              onClick={addOption}
              className="px-3 py-1 rounded border border-white/20 text-white hover:bg-white/10"
            >
              + Add option
            </button>
          </div>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="input w-full"
                placeholder={`Option ${i + 1}`}
                value={o.label}
                onChange={(e) => setOption(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                disabled={options.length <= 2}
                title={options.length <= 2 ? "At least two options required" : "Remove"}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="scale-110"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Set as active poll</span>
          </label>

          <div>
            <label className="block text-sm text-white/70 mb-1">Closes At (optional)</label>
            <input
              className="input w-full"
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save poll"}
          </button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
