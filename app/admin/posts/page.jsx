"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminPostsPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileRef = useRef(null);

  // auto-fill slug as you type a title (but don’t overwrite if user edits slug)
  useEffect(() => {
    if (!slug) setSlug(slugify(title));
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onUpload() {
    setUploadMsg("");
    setUploadedUrl("");

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadMsg("Please choose a file first.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const errText = data?.error ? `• ${data.error}` : "";
        throw new Error(`Upload failed (${res.status}) ${errText}`);
      }

      // success
      if (data?.url) {
        setUploadedUrl(data.url);
        setUploadMsg("✅ Uploaded!");
      } else {
        setUploadMsg("Uploaded, but no URL returned.");
      }
    } catch (err) {
      setUploadMsg(`❌ ${err.message || "Upload failed"}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave(e) {
    e?.preventDefault?.();
    setSaving(true);
    setMessage("");

    try {
      if (!title.trim()) throw new Error("Please add a title.");
      const finalSlug = (slug || slugify(title)).trim();
      if (!finalSlug) throw new Error("Please add a slug.");

      const payload = {
        slug: finalSlug,
        title: title.trim(),
        date: date || null,
        excerpt: excerpt.trim(),
        content: content,
        // Optionally include a hero/cover image URL if you want to use it in frontmatter
        coverImage: uploadedUrl || null,
      };

      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const errText = data?.error ? `• ${data.error}` : "";
        throw new Error(`Save failed (${res.status}) ${errText}`);
      }

      setMessage("✅ Saved!");
    } catch (err) {
      setMessage(`❌ ${err.message || "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Admin — Blog Posts</h1>

      <form onSubmit={onSave} className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm text-white/70">Title</label>
          <input
            className="input w-full mt-1 mb-4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Week 1 Waiver Wire Gems"
          />

          <label className="block text-sm text-white/70">Slug</label>
          <input
            className="input w-full mt-1 mb-4"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugify(title) || "auto-from-title"}
          />

          <label className="block text-sm text-white/70">Date</label>
          <input
            type="date"
            className="input w-full mt-1 mb-4"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <label className="block text-sm text-white/70">Excerpt</label>
          <textarea
            className="input w-full mt-1 mb-4"
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A quick teaser for the blog card…"
          />

          <label className="block text-sm text-white/70">Content (Markdown)</label>
          <textarea
            className="input w-full mt-1"
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`# Heading

Some markdown with **bold**, _italics_, and lists.

- one
- two
`}
          />

          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white"
            >
              {saving ? "Saving…" : "Save Post"}
            </button>
            {message && <span className="text-sm text-white/70">{message}</span>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Cover Image (optional)</h2>
          <div className="card p-4">
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              className="block w-full text-sm"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={onUpload}
                disabled={uploading}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/15 border border-white/20"
              >
                {uploading ? "Uploading…" : "Upload image"}
              </button>
              {uploadMsg && <span className="text-sm text-white/70">{uploadMsg}</span>}
            </div>

            {uploadedUrl ? (
              <div className="mt-4">
                <div className="text-xs text-white/60 mb-2 break-all">
                  {uploadedUrl}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedUrl}
                  alt="Uploaded preview"
                  className="rounded-xl border border-white/10 max-h-64"
                />
              </div>
            ) : null}
          </div>

          <h2 className="text-lg font-semibold mt-6 mb-2">Preview</h2>
          <article className="prose prose-invert max-w-none card p-4">
            <h1 className="mb-0">{title || "Untitled Post"}</h1>
            <p className="text-white/60 mt-1">
              {date ? new Date(date).toLocaleDateString() : ""}
            </p>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || "_Nothing here yet…_"}
            </ReactMarkdown>
          </article>
        </div>
      </form>
    </div>
  );
}
