"use client";

import { useEffect, useRef, useState } from "react";

export default function AdminPostsPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10) // yyyy-mm-dd
  );
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");

  const fileRef = useRef(null);

  // Optional: auto-slug from title when slug empty
  useEffect(() => {
    if (!slug && title) {
      setSlug(
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  async function handleUpload() {
    setUploadMsg("");
    setUploadedUrl("");

    const f = fileRef.current?.files?.[0];
    if (!f) {
      setUploadMsg("Please choose a file first.");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", f);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: fd,
        // IMPORTANT: send cookie with request
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadMsg(`❌ Upload failed (${res.status}) ${data?.error || ""}`);
        return;
        }
      setUploadedUrl(data.url);
      setUploadMsg("✅ Uploaded! (copied URL into clipboard)");
      try {
        await navigator.clipboard.writeText(data.url);
      } catch {}
    } catch (err) {
      setUploadMsg(`❌ Upload error: ${String(err.message || err)}`);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      if (!slug) throw new Error("Missing slug");
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: send cookie with request
        credentials: "include",
        body: JSON.stringify({ title, date, excerpt, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveMsg(`❌ Save failed (${res.status}) · ${data?.error || "Forbidden"}`);
      } else {
        setSaveMsg("✅ Saved!");
      }
    } catch (err) {
      setSaveMsg(`❌ ${String(err.message || err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-5xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Admin — Blog Posts</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: editor */}
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-sm text-white/70">Title</div>
            <input
              className="input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title…"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-white/70">Slug</div>
            <input
              className="input w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-post-slug"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-white/70">Date</div>
            <input
              type="date"
              className="input w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-white/70">Excerpt</div>
            <textarea
              className="input w-full h-28"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary (optional)…"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-white/70">Content (Markdown)</div>
            <textarea
              className="input w-full min-h-[320px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write Markdown here…"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-gold disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Post"}
            </button>
            {saveMsg && (
              <span
                className={saveMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}
              >
                {saveMsg}
              </span>
            )}
          </div>
        </div>

        {/* Right column: upload + preview */}
        <div className="space-y-4">
          <div>
            <div className="mb-2 font-semibold">Cover Image (optional)</div>
            <div className="flex items-center gap-3">
              <input type="file" ref={fileRef} className="text-sm" />
              <button onClick={handleUpload} className="px-3 py-2 rounded bg-white/10 border border-white/20 hover:bg-white/15">
                Upload image
              </button>
            </div>
            {uploadMsg && (
              <div className="mt-2 text-sm text-white/80">{uploadMsg}</div>
            )}
            {uploadedUrl && (
              <div className="mt-2 text-sm text-white/60 break-all">
                URL: {uploadedUrl}
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="text-sm text-white/60">Preview</div>
            <div className="mt-2 font-semibold">{title || "(title…)"}</div>
            <div className="text-white/60 text-sm">
              {date ? new Date(date).toLocaleDateString() : ""}
            </div>
            <div className="mt-2 text-white/80">{excerpt}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
