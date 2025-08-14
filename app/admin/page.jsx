"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AdminBlog() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileRef = useRef(null);

  async function onSave(e) {
    e.preventDefault();
    setMsg("Saving…");

    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        credentials: "include",             // <<—— send admin cookie
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          date,
          excerpt,
          content,
          coverImage: uploadedUrl || undefined,
        }),
      });

      if (!res.ok) {
        let reason = "";
        try {
          const j = await res.json();
          reason = j?.error || j?.reason || "";
        } catch {}
        throw new Error(`${res.status} ${res.statusText} ${reason}`.trim());
      }

      setMsg("✅ Saved!");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg(`❌ Save failed (${String(err.message)})`);
    }
  }

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    setUploadMsg("");
    if (!file) {
      setUploadMsg("Please choose a file first.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        credentials: "include",            // <<—— send admin cookie
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          `${res.status} ${res.statusText} ${data.error || ""}`.trim()
        );
      }

      setUploadedUrl(data.url);
      setUploadMsg("✅ Uploaded!");
      setTimeout(() => setUploadMsg(""), 2000);
    } catch (err) {
      setUploadMsg(`❌ Upload failed (${String(err.message)})`);
    }
  }

  // convenience: keep slug roughly in sync with title
  useEffect(() => {
    if (!slug && title) {
      setSlug(
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold mb-6">Admin — Blog Posts</h1>

      <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="block text-sm mt-4 mb-1">Slug</label>
          <input
            className="input w-full"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />

          <label className="block text-sm mt-4 mb-1">Date</label>
          <input
            type="date"
            className="input w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <label className="block text-sm mt-4 mb-1">Excerpt</label>
          <textarea
            className="input w-full min-h-24"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />

          <label className="block text-sm mt-6 mb-1">Content (Markdown)</label>
          <textarea
            className="input w-full min-h-[280px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <div className="card p-4">
            <p className="text-sm font-medium mb-2">
              Cover Image (optional)
            </p>
            <input type="file" ref={fileRef} />
            <div className="mt-2 flex gap-3 items-center">
              <button
                type="button"
                onClick={onUpload}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20"
              >
                Upload image
              </button>
              {uploadMsg && <span className="text-sm">{uploadMsg}</span>}
            </div>
            {uploadedUrl && (
              <p className="mt-2 text-xs break-all text-white/70">
                {uploadedUrl}
              </p>
            )}
          </div>

          <div className="card p-4 mt-4">
            <p className="text-sm font-medium mb-2">Preview</p>
            <h3 className="font-semibold">{title || "—"}</h3>
            <p className="text-xs text-white/60">
              {new Date(date).toLocaleDateString()}
            </p>
            <p className="mt-2 text-sm text-white/80">{excerpt}</p>
          </div>
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            className="btn-gold"
          >
            Save Post
          </button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
