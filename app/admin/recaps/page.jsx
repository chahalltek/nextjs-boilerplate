"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function RecapsAdminPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // form state
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commit, setCommit] = useState("");

  // image upload (reuses your existing /api/admin/uploads)
  const fileInputRef = useRef(null);
  const [uploadMsg, setUploadMsg] = useState("");

  function resetForm() {
    setSlug(""); setTitle(""); setDate(""); setExcerpt(""); setContent("");
    setPublished(false); setCommit(""); setMsg("");
  }

  async function loadList() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/recaps", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/recaps")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Load failed (${res.status})`);
      setList(data.recaps || []);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadList(); }, []);

  async function onSave(e) {
    e.preventDefault();
    setMsg(""); setCommit(""); setSaving(true);

    try {
      if (!slug || !title) throw new Error("Slug and Title are required");
      const method = "PUT";
      const url = `/api/admin/recaps/${encodeURIComponent(slug)}`;
      const body = { title, date, excerpt, content, published };

      // If new file (not in list), POST instead
      const exists = list.some((r) => r.slug === slug);
      const res = await fetch(exists ? url : "/api/admin/recaps", {
        method: exists ? method : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(exists ? body : { slug, ...body }),
      });

      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/recaps")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Save failed (${res.status})`);
      setCommit(data.commit || "");
      setMsg("✅ Saved!");
      await loadList();
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function onEdit(slug) {
    setMsg(""); setCommit("");
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/recaps")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Load failed (${res.status})`);
      setSlug(data.data.slug || slug);
      setTitle(data.data.title || "");
      setDate(data.data.date || "");
      setExcerpt(data.data.excerpt || "");
      setContent(data.data.content || "");
      setPublished(!!data.data.published);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  }

  async function onTogglePublish(slug, nextPublished) {
    setMsg(""); setCommit("");
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ published: nextPublished }),
      });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/recaps")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Publish failed (${res.status})`);
      setMsg("✅ Updated");
      await loadList();
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  }

  async function onDelete(slug) {
    if (!confirm(`Delete recap "${slug}"? This cannot be undone.`)) return;
    setMsg(""); setCommit("");
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/recaps")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Delete failed (${res.status})`);
      setMsg("🗑️ Deleted");
      if (slug === slug) resetForm();
      await loadList();
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  }

  function onPickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMsg("Uploading…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/recaps")}`;
          return;
        }
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      // Paste URL into content quickly:
      const url = data.url;
      setContent((c) => `${c}\n\n![image](${url})\n`);
      setUploadMsg("✅ Uploaded (URL added to content)");
    } catch (err) {
      setUploadMsg(`❌ ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="container max-w-5xl py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Weekly Recaps — Admin</h1>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
        >
          ← Admin Home
        </Link>
      </div>

      {/* Editor */}
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
              Saved as <code>content/recaps/&lt;slug&gt;.md</code>
            </p>
          </div>
          <div>
           <label className="block text-sm text-white/70 mb-1">Tags</label>
           <input
           className="input w-full"
           placeholder="week-1, recap, injuries"
           value={tags}
           onChange={(e) => setTags(e.target.value)}
        />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Title</label>
              <input
                className="input w-full"
                placeholder="Week 1: Coulda, Woulda, Shoulda"
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
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Excerpt</label>
            <input
              className="input w-full"
              placeholder="Short teaser for the tile view"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onPickFile}
              className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10"
            >
              Upload image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            {uploadMsg && <span className="text-sm text-white/70">{uploadMsg}</span>}
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Content (Markdown)</label>
            <textarea
              className="input w-full min-h-[260px]"
              placeholder="Write your weekly recap in Markdown…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published (visible on site)
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Recap"}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
            {commit && <span className="text-xs text-white/50">commit: {commit.slice(0, 7)}</span>}
          </div>
        </div>
      </form>

      {/* Existing list */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Existing Recaps</h2>
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-white/70">No recaps yet.</div>
        ) : (
          <div className="divide-y divide-white/10 rounded border border-white/10">
            {list.map((r) => (
              <div key={r.slug} className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-3">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-white/50">
                    {r.date || "no date"} • {r.slug} • {r.published ? "Published" : "Hidden"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a className="btn" href={`/cws/${r.slug}`} target="_blank" rel="noreferrer">View</a>
                  <button
                    className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10"
                    onClick={() => onEdit(r.slug)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10"
                    onClick={() => onTogglePublish(r.slug, !r.published)}
                  >
                    {r.published ? "Hide" : "Publish"}
                  </button>
                  <button
                    className="px-3 py-1.5 rounded border border-red-400 text-red-300 hover:bg-red-500/10"
                    onClick={() => onDelete(r.slug)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
