"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export default function AdminPostsPage() {
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
        // if session missing, bounce to login
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
      // reset the file input so selecting same file again still fires onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          excerpt,
          content: coverUrl
            ? `![cover image](${coverUrl})\n\n${content}`
            : content,
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
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container max-w-3xl py-10">
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
            File will be saved as <code>content/blog/&lt;slug&gt;.md</code>
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
            <label className="block text-sm text-white/70 mb-1">Content (Markdown)</label>
            <textarea
              className="input w-full min-h-[240px]"
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
            <span className="text-xs text-white/50">commit: {commitSha.slice(0, 7)}</span>
          )}
        </div>

        <p className="text-xs text-white/40">
          Tip: after save, the site may redeploy automatically (if a Deploy Hook is configured).
        </p>
      </form>
    </div>
  );
}
