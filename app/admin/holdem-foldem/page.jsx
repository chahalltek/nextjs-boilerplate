"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminHoldFoldPage() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  // form state
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [commitSha, setCommitSha] = useState("");

  function resetForm() {
    setSlug("");
    setTitle("");
    setDate("");
    setContent("");
    setSaveMsg("");
    setCommitSha("");
  }

  async function loadList() {
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetch("/api/admin/holdem-foldem", {
        method: "GET",
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/holdem-foldem")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `List failed (${res.status})`);
      setItems(data.items || []);
    } catch (e) {
      setListError(e.message || String(e));
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  function slugify(v) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    setCommitSha("");

    if (!slug.trim()) {
      setSaveMsg("❌ Please provide a slug.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      setSaveMsg("❌ Please provide a title and content.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/holdem-foldem/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          date: date || undefined,
          content,
        }),
      });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/holdem-foldem")}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Save failed (${res.status})`);
      setCommitSha(data.commit || "");
      setSaveMsg("✅ Saved! (Git commit created)");
      loadList();
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function onPick(item) {
    setSlug(item.slug);
    setTitle(item.title || "");
    setDate(item.date || "");
    setContent(item.excerpt || ""); // we don’t fetch full body in list; leave blank unless you want to load it separately
    setSaveMsg("");
    setCommitSha("");
  }

  async function onDelete(item) {
    if (!confirm(`Delete "${item.title || item.slug}"? This commits a delete to the repo.`)) return;
    try {
      const res = await fetch(`/api/admin/holdem-foldem/${encodeURIComponent(item.slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/holdem-foldem")}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Delete failed (${res.status})`);
      if (slug === item.slug) resetForm();
      loadList();
    } catch (e) {
      alert(`Delete error: ${e.message}`);
    }
  }

  return (
    <div className="container max-w-6xl py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Hold ’em / Fold ’em — Create / Edit</h1>
        <Link
          href="/admin"
          className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10"
        >
          ← Admin Home
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Editor */}
        <form onSubmit={onSave} className="space-y-5">
          <div className="card p-5">
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              placeholder="2025-week-1"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
            />
            <p className="text-xs text-white/50 mt-1">
              File will be saved as <code>content/holdfold/&lt;slug&gt;.md</code>
            </p>
          </div>

          <div className="card p-5 space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Title</label>
              <input
                className="input w-full"
                placeholder="Hold ’em / Fold ’em — Week 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Date</label>
              <input
                className="input w-full"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">
                Content (Markdown)
              </label>
              <textarea
                className="input w-full min-h-[240px]"
                placeholder="Write your stash-or-trash takes…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded border border-white/20 text-white hover:bg-white/10"
            >
              New
            </button>
            {saveMsg && <span className="text-sm">{saveMsg}</span>}
            {commitSha && (
              <span className="text-xs text-white/50">commit: {commitSha.slice(0, 7)}</span>
            )}
          </div>
        </form>

        {/* List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Existing entries</h2>
            <button
              onClick={loadList}
              className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10"
            >
              Refresh
            </button>
          </div>

          <div className="rounded-xl border border-white/10 p-3 bg-white/5 min-h-[120px]">
            {loadingList ? (
              <div className="text-white/70 text-sm">Loading…</div>
            ) : listError ? (
              <div className="text-red-300 text-sm">Error: {listError}</div>
            ) : items.length === 0 ? (
              <div className="text-white/60 text-sm">No entries yet.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {items.map((it) => (
                  <li key={it.slug} className="py-2 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{it.title || it.slug}</div>
                      <div className="text-xs text-white/50">
                        {it.date ? new Date(it.date).toLocaleDateString() : "—"} · {it.slug}
                      </div>
                    </div>
                    <Link
                      href={`/holdem-foldem/${it.slug}`}
                      className="text-sm px-2.5 py-1 rounded border border-white/20 hover:bg-white/10"
                      title="Open public page"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => onPick(it)}
                      className="text-sm px-2.5 py-1 rounded border border-white/20 hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(it)}
                      className="text-sm px-2.5 py-1 rounded border border-red-400/40 text-red-200 hover:bg-red-400/10"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-white/40">
            Tip: after save, the site may redeploy automatically (if a Deploy Hook is configured).
          </p>
        </div>
      </div>
    </div>
  );
}
