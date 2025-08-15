// app/admin/posts/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function AdminPostsPage() {
  // left column list
  const [items, setItems] = useState([]); // [{slug, title?, draft?}]
  const [listMsg, setListMsg] = useState("");

  // editor fields
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [commitSha, setCommitSha] = useState("");

  const fileInputRef = useRef(null);

  // ---- list helpers ----
  async function loadList() {
    setListMsg("");
    try {
      const res = await fetch("/api/admin/posts", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
        return;
      }
      const raw = data.posts || data.data?.posts || [];
      const mapped =
        Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string"
          ? raw.map((s) => ({ slug: s }))
          : raw;
      setItems(mapped || []);
      if (!mapped || mapped.length === 0) setListMsg("No posts yet.");
    } catch (e) {
      setListMsg("Failed to load list.");
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  // ---- upload image ----
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
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
          return;
        }
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      setCoverUrl(data.url);
      setUploadMsg("✅ Uploaded! (copied below)");
    } catch (err) {
      setUploadMsg(`❌ ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ---- save new/update ----
  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    setCommitSha("");
    if (!slug.trim()) return setSaveMsg("❌ Please provide a slug.");
    if (!title.trim() || !content.trim())
      return setSaveMsg("❌ Please provide a title and content.");

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          excerpt,
          content: coverUrl ? `![cover image](${coverUrl})\n\n${content}` : content,
          date: date || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
          return;
        }
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setCommitSha(data.commit || "");
      setSaveMsg("✅ Saved! (Git commit created)");
      loadList();
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ---- hide/unhide/delete actions ----
  async function setDraft(slug, draft) {
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Failed (${res.status})`);
      await loadList();
    } catch (e) {
      alert(e.message);
    }
  }

  async function removePost(slug) {
    if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Failed (${res.status})`);
      // If the editor is on that slug, clear it
      if (slug === slug) {
        setSlug("");
        setTitle("");
        setExcerpt("");
        setDate("");
        setContent("");
        setCoverUrl("");
      }
      await loadList();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="container max-w-6xl py-10 grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
      {/* Left: existing posts */}
      <aside className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Existing posts</h2>
         <Link
  href="/admin"
  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20"
>
  <span aria-hidden>←</span> Admin Home
</Link>
        </div>

        {items.length === 0 ? (
          <p className="text-white/60 text-sm">{listMsg || "No posts yet."}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.slug}
                className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-white/5"
              >
                <button
                  className="text-left flex-1 text-white/90 hover:text-white"
                  onClick={() => setSlug(it.slug)}
                  title={it.title || it.slug}
                >
                  {it.slug}
                  {it.draft ? (
                    <span className="ml-2 text-xs rounded bg-white/10 px-1.5 py-0.5">
                      draft
                    </span>
                  ) : null}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    className="text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10"
                    onClick={() => setDraft(it.slug, true)}
                    title="Hide (set draft: true)"
                  >
                    Hide
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10"
                    onClick={() => setDraft(it.slug, false)}
                    title="Unhide (set draft: false)"
                  >
                    Unhide
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded border border-red-400/40 text-red-300 hover:bg-red-400/10"
                    onClick={() => removePost(it.slug)}
                    title="Delete permanently"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Right: editor */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Blog — Create / Edit</h1>
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
              placeholder="my-first-post"
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
              File will be saved as <code>content/posts/&lt;slug&gt;.md</code>
            </p>
          </div>

          <div className="card p-5 space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Title</label>
              <input
                className="input w-full"
                placeholder="Post title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Excerpt</label>
              <input
                className="input w-full"
                placeholder="Short summary (optional)"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
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

          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPickFile}
                className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10"
              >
                Upload image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              {uploadMsg && <span className="text-sm text-white/70">{uploadMsg}</span>}
            </div>
            {coverUrl && (
              <div className="text-sm">
                <div className="text-white/70">Image URL:</div>
                <code className="break-all">{coverUrl}</code>
              </div>
            )}

            <div>
              <label className="block text-sm text-white/70 mb-1">
                Content (Markdown)
              </label>
              <textarea
                className="input w-full min-h-[260px]"
                placeholder="Write your post in Markdown…"
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

            {saveMsg && <span className="text-sm">{saveMsg}</span>}
            {commitSha && (
              <span className="text-xs text-white/50">
                commit: {commitSha.slice(0, 7)}
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
