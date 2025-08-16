"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminHoldFoldPage() {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [holds, setHolds] = useState("- Player A — brief reason\n- Player B — brief reason");
  const [folds, setFolds] = useState("- Player X — brief reason\n- Player Y — brief reason");
  const [notes, setNotes] = useState("## Notes\nShort blurb about bye weeks, injuries, or vibes.\n");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [existing, setExisting] = useState([]);

  async function loadExisting() {
    setExisting([]);
    try {
      const res = await fetch("/api/admin/holdfold", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setExisting(data.items || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  useEffect(() => {
    loadExisting();
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    if (!slug.trim() || !title.trim()) {
      setSaveMsg("❌ Please provide a slug and title.");
      return;
    }
    setSaving(true);
    try {
      const content = `---\ntitle: ${JSON.stringify(title)}\ndate: ${JSON.stringify(
        date || new Date().toISOString().slice(0, 10)
      )}\n---\n\n## Hold ’em\n\n${holds}\n\n## Fold ’em\n\n${folds}\n\n${notes}\n`;

      const res = await fetch(`/api/admin/holdfold/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, date, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/holdem-foldem")}`;
          return;
        }
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setSaveMsg("✅ Saved!");
      loadExisting();
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container max-w-4xl py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin — Hold ’em / Fold ’em</h1>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
        >
          ← Admin Home
        </Link>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        <div className="card p-5 space-y-3">
          <div>
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              placeholder="2025-week-01"
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
              File will be saved as <code>content/holdfold/&lt;slug&gt;.md</code>
            </p>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Title</label>
            <input
              className="input w-full"
              placeholder="Week 1 — Hope, Dreams, and Waiver Schemes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Date</label>
            <input
              type="date"
              className="input w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="card p-5 space-y-2">
            <label className="block text-sm text-white/70 mb-1">Hold ’em (one per line)</label>
            <textarea
              className="input w-full min-h-[160px]"
              value={holds}
              onChange={(e) => setHolds(e.target.value)}
            />
          </div>

          <div className="card p-5 space-y-2">
            <label className="block text-sm text-white/70 mb-1">Fold ’em (one per line)</label>
            <textarea
              className="input w-full min-h-[160px]"
              value={folds}
              onChange={(e) => setFolds(e.target.value)}
            />
          </div>
        </div>

        <div className="card p-5 space-y-2">
          <label className="block text-sm text-white/70 mb-1">Notes (Markdown)</label>
          <textarea
            className="input w-full min-h-[160px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saveMsg && <span className="text-sm">{saveMsg}</span>}
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Existing entries</h2>
        {existing.length === 0 ? (
          <div className="text-white/60 text-sm">None yet.</div>
        ) : (
          <ul className="space-y-2">
            {existing.map((item) => (
              <li
                key={item.slug}
                className="flex items-center justify-between rounded-lg border border-white/10 p-3"
              >
                <div>
                  <div className="font-semibold">{item.title || item.slug}</div>
                  {item.date && (
                    <div className="text-xs text-white/50">
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/holdem-foldem/${item.slug}`}
                    className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                  >
                    View
                  </Link>
                  <a
                    href={`/holdem-foldem/${item.slug}#comments`}
                    className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open comments
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
