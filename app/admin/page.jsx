// app/admin/page.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AdminPage() {
  // form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [draft, setDraft] = useState(true);
  const [content, setContent] = useState("");

  // upload state
  const fileInputRef = useRef(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  // save state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // helpers
  useEffect(() => {
    if (!slug && title) {
      setSlug(
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }, [title]);

  async function handleUpload(file) {
    if (!file) return;
    setUploadMsg("Uploading…");
    setUploadedUrl("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: form,
        // include the admin session cookie
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // show server error (e.g., 403) if any
        throw new Error(
          `Upload failed (${res.status}) ${data.error ? "• " + data.error : ""}`
        );
      }

      setUploadedUrl(data.url || "");
      setUploadMsg("✅ Uploaded!");
    } catch (err) {
      setUploadMsg(err.message || "Upload failed");
    }
  }

  async function onSave() {
    setSaving(true);
    setSaveMsg("");

    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          draft,
          content,
          image: uploadedUrl || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || `Save failed (HTTP ${res.status.toString()})`
        );
      }

      setSaveMsg("✅ Saved!");
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Admin — New Post</h1>

      <label className="block text-sm text-white/70">Title</label>
      <input
        className="input w-full mt-1 mb-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
      />

      <label className="block text-sm text-white/70">Slug</label>
      <input
        className="input w-full mt-1 mb-4"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="my-post-slug"
      />

      <label className="block text-sm text-white/70">Excerpt</label>
      <input
        className="input w-full mt-1 mb-4"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="One-line summary"
      />

      <label className="inline-flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={draft}
          onChange={(e) => setDraft(e.target.checked)}
        />
        <span>Draft (hide from public)</span>
      </label>

      {/* Upload */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e.currentTarget.files?.[0] || null)}
        />
        <button
          type="button"
          className="btn-gold"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload image…
        </button>
        {uploadMsg && <span className="ml-3 text-sm text-white/70">{uploadMsg}</span>}
        {uploadedUrl && (
          <div className="mt-3">
            <img
              src={uploadedUrl}
              alt="uploaded"
              className="max-h-40 rounded border border-white/10"
            />
            <p className="text-xs text-white/60 mt-1 break-all">{uploadedUrl}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {/* Optional delete button you already had */}
        {/* <button type="button" className="px-4 py-2 rounded-2xl border border-red-400/30 text-red-300">
          Delete
        </button> */}

        {saveMsg && <span className="text-sm text-white/70">{saveMsg}</span>}
      </div>

      <textarea
        className="input w-full h-64"
        placeholder="Write Markdown here…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {/* Live preview (optional) */}
      {content && (
        <div className="prose prose-invert mt-8">
          <h3 className="text-white/80">Preview</h3>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
