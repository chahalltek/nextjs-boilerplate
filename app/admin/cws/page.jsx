"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export default function AdminCwsPage() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  // editor state
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(false);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false); // are we editing an existing recap?

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const contentRef = useRef(null);

  // ---------- helpers ----------
  function normalizeSlug(s) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function load() {
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetch("/api/admin/recaps", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(Array.isArray(data.recaps) ? data.recaps : []);
    } catch (e) {
      setListError(e.message || String(e));
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
    return arr;
  }, [items]);

  function resetForm() {
    setSlug("");
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setExcerpt("");
    setPublished(false);
    setContent("");
    setEditing(false);
    setSaveMsg("");
  }

  function startEditLocalFields(it) {
  setSlug(it.slug || "");
  setTitle(it.title || "");
  setDate(it.date || new Date().toISOString().slice(0, 10));
  setExcerpt(it.excerpt || "");
  setPublished(!!it.published);
  setSaveMsg("");
  setEditing(true);
  setTimeout(() => contentRef.current?.focus(), 0);
}

async function startEdit(it) {
  // fill what we already know
  startEditLocalFields(it);

  // if list payload didn’t include content, fetch it now
  if (it.content && typeof it.content === "string") {
    setContent(it.content);
    return;
  }

  setContent(""); // clear while loading
  try {
    const res = await fetch(`/api/admin/recaps/${encodeURIComponent(it.slug)}`, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok && typeof data.content === "string") {
      setContent(data.content);
    } else {
      setContent("");
      setSaveMsg(`❌ Could not load content for "${it.slug}"`);
    }
  } catch (e) {
    setContent("");
    setSaveMsg(`❌ ${e?.message || "Failed to load content"}`);
  }
}

  }

  // ---------- mutations ----------
  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    if (!slug.trim() || !title.trim() || !content.trim()) {
      setSaveMsg("❌ Please provide slug, title, and content.");
      return;
    }
    setSaving(true);
    try {
      // API accepts POST for create *or* update (overwrites existing file)
      const res = await fetch("/api/admin/recaps", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: normalizeSlug(slug),
          title,
          date,
          excerpt,
          published,
          content,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `Save failed (${res.status})`);

      setSaveMsg("✅ Saved!");
      await load();
      // stay in edit mode (handy), or reset—choose one:
      // resetForm();
    } catch (e) {
      setSaveMsg(`❌ ${e.message || String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(slug, nextPublished) {
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load();
    } catch (e) {
      alert(`Failed to update publish state: ${e.message || e}`);
    }
  }

  async function onDelete(slug) {
    if (!confirm(`Delete recap "${slug}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load();
      if (editing && slug === normalizeSlug(slug)) resetForm();
    } catch (e) {
      alert(`Failed to delete: ${e.message || e}`);
    }
  }

  // ---------- UI ----------
  return (
    <div className="container max-w-5xl py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Weekly Recap — Admin</h1>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
        >
          ← Admin Home
        </Link>
      </div>

      {/* Existing recaps (now shown FIRST) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Existing Recaps</h2>
          <button
            onClick={resetForm}
            className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            title="Start a new recap"
          >
            + New recap
          </button>
        </div>

        {loadingList && <div className="text-white/70">Loading…</div>}
        {listError && <div className="text-red-400">Error: {listError}</div>}

        {!loadingList && !listError && sorted.length === 0 && (
          <div className="text-white/70">No recaps found yet.</div>
        )}

        <div className="grid gap-3">
          {sorted.map((it) => (
            <div key={it.slug} className="card p-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-white/50">
                  {it.date || "no date"} • slug: <code>{it.slug}</code> •{" "}
                  {it.published ? (
                    <span className="text-green-400">active</span>
                  ) : (
                    <span className="text-yellow-300">draft</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublish(it.slug, !it.published)}
                  className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                  title={it.published ? "Hide (unpublish)" : "Activate (publish)"}
                >
                  {it.published ? "Hide" : "Activate"}
                </button>

                <button
                  onClick={() => startEdit(it)}
                  className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                  title="Edit this recap"
                >
                  Edit
                </button>

                <button
                  onClick={() => onDelete(it.slug)}
                  className="px-3 py-1.5 rounded border border-red-500/40 text-red-200 hover:bg-red-500/10 text-sm"
                  title="Delete file"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editor */}
      <form onSubmit={onSave} className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing ? "Edit Recap" : "Create Recap"}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              placeholder="2025-week-01"
              value={slug}
              onChange={(e) => setSlug(normalizeSlug(e.target.value))}
            />
            <p className="text-xs text-white/50 mt-1">
              File is saved as <code>content/recaps/&lt;slug&gt;.md</code>. Changing the slug will
              create a new file.
            </p>
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
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Title</label>
          <input
            className="input w-full"
            placeholder="Week 1 Recap — Shoulda started the kicker"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Excerpt</label>
          <input
            className="input w-full"
            placeholder="Short teaser for the archive tiles (optional)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="published"
            type="checkbox"
            className="h-4 w-4"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <label htmlFor="published" className="text-sm text-white/80">
            Published (visible on /cws)
          </label>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Content (Markdown)</label>
          <textarea
            ref={contentRef}
            className="input w-full min-h-[240px]"
            placeholder="Write your recap in Markdown…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Save Recap"}
          </button>
          {saveMsg && <span className="text-sm">{saveMsg}</span>}
        </div>
      </form>

      <p className="text-xs text-white/40">
        Tip: after saving/publishing, the site may redeploy automatically if a Deploy Hook is
        configured.
      </p>
    </div>
  );
}
