// app/admin/polls/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPollsPage() {
  // list
  const [items, setItems] = useState([]); // [{slug, active}]
  const [activeSlug, setActiveSlug] = useState(null);
  const [listMsg, setListMsg] = useState("");

  // editor
  const [slug, setSlug] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [makeActive, setMakeActive] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function addOption() {
    setOptions((o) => [...o, ""]);
  }
  function setOpt(i, v) {
    setOptions((o) => o.map((x, idx) => (idx === i ? v : x)));
  }

  async function loadList() {
    setListMsg("");
    try {
      const res = await fetch("/api/admin/polls", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/polls")}`;
        return;
      }
      setItems(data.polls || []);
      setActiveSlug(data.activeSlug ?? null);
      if (!data.polls || data.polls.length === 0) setListMsg("No polls yet.");
    } catch {
      setListMsg("Failed to load polls.");
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    if (!slug.trim() || !question.trim()) {
      setSaveMsg("❌ Provide slug and question.");
      return;
    }
    const cleaned = options.map((x) => x.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      setSaveMsg("❌ At least two options.");
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
          options: cleaned.map((label) => ({ label })),
          active: makeActive,
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
      setSaveMsg("✅ Saved!");
      setSlug("");
      setQuestion("");
      setOptions(["", ""]);
      setMakeActive(false);
      await loadList();
    } catch (e) {
      setSaveMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function activate(s) {
    await fetch(`/api/admin/polls/${encodeURIComponent(s)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "activate" }),
    });
    await loadList();
  }
  async function deactivate(s) {
    await fetch(`/api/admin/polls/${encodeURIComponent(s)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "deactivate" }),
    });
    await loadList();
  }
  async function removePoll(s) {
    if (!confirm(`Delete poll "${s}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/polls/${encodeURIComponent(s)}`, {
      method: "DELETE",
      credentials: "include",
    });
    await loadList();
  }

  return (
    <div className="container max-w-6xl py-10 grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
      {/* left: list */}
      <aside className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Existing polls</h2>
          <Link href="/admin" className="text-white/70 hover:text-white text-sm">
            ← Admin
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-white/60 text-sm">{listMsg || "No polls yet."}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.slug}
                className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-white/5"
              >
                <div className="text-white/90">
                  {it.slug}
                  {it.active ? (
                    <span className="ml-2 text-xs rounded bg-white/10 px-1.5 py-0.5">
                      active
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {it.active ? (
                    <button
                      className="text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10"
                      onClick={() => deactivate(it.slug)}
                      title="Deactivate poll"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10"
                      onClick={() => activate(it.slug)}
                      title="Make this the active poll"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    className="text-xs px-2 py-1 rounded border border-red-400/40 text-red-300 hover:bg-red-400/10"
                    onClick={() => removePoll(it.slug)}
                    title="Delete poll"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* right: create/edit */}
      <section>
        <h1 className="text-2xl font-bold mb-6">Admin — Polls</h1>

        <form onSubmit={onSave} className="card p-5 space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              placeholder="week-1"
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
              Saved as <code>data/polls/&lt;slug&gt;.json</code>
            </p>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Question</label>
            <input
              className="input w-full"
              placeholder="Who wins this week?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Options</label>
            {options.map((opt, i) => (
              <input
                key={i}
                className="input w-full"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => setOpt(i, e.target.value)}
              />
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-sm rounded border border-white/20 px-2 py-1 hover:bg-white/10"
            >
              + Add option
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={makeActive}
              onChange={(e) => setMakeActive(e.target.checked)}
            />
            Make active after save
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Poll"}
            </button>
            {saveMsg && <span className="text-sm">{saveMsg}</span>}
          </div>
        </form>
      </section>
    </div>
  );
}
