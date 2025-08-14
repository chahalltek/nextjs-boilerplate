// app/admin/page.jsx
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const runtime = "edge";

export default function AdminPage() {
  // --- Uploader state ---
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");

  async function handlePick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMsg("");
    setUploadedUrl("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/uploads", { credentials: "include", 
  method: "POST",
  body: formData,
  credentials: "include",   // 👈 IMPORTANT
});
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(`Upload failed (${res.status}) ${err.error || ""}`);
}
      } else {
        setUploadedUrl(data.url);
        setUploadMsg("✅ Uploaded!");
      }
    } catch (err) {
      setUploadMsg("Upload failed (network error)");
    } finally {
      setUploading(false);
      // allow re-upload without refreshing
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // --- (Optional) blog post editor shell you already had ---
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [draft, setDraft] = useState(false);
  const [content, setContent] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function savePost(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    try {
      const payload = {
        title,
        date,
        excerpt,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        draft,
        content,
      };

      // save post
const res = await fetch("/api/admin/posts", { credentials: "include", 
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title, date, excerpt, tags, draft, content }),
  credentials: "include",   // 👈 IMPORTANT
});
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(`Save failed (${res.status}) ${err.error || ""}`);
}
      } else {
        setSaveMsg("✅ Saved!");
      }
    } catch {
      setSaveMsg("Save failed (network error)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-12 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex gap-4">
          <Link href="/admin/polls" className="underline text-white/80 hover:text-white">Polls</Link>
          <Link href="/" className="underline text-white/80 hover:text-white">← Back to site</Link>
        </div>
      </div>

      {/* Image Uploader */}
      <section className="mt-8 card p-5">
        <h2 className="text-lg font-semibold mb-3">Upload image</h2>
        <p className="text-sm text-white/70 mb-4">
          Images are saved to <code>/public/uploads/</code> and served at <code>/uploads/&lt;filename&gt;</code>.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="btn-gold disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload Image"}
          </button>

          {uploadMsg && <span className="text-sm text-white/80">{uploadMsg}</span>}
          {uploadedUrl && (
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noreferrer"
              className="underline text-sm text-white/90"
            >
              {uploadedUrl}
            </a>
          )}
        </div>
      </section>

      {/* Blog editor (unchanged other than the button styling/behavior) */}
      <form onSubmit={savePost} className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold">Quick Post Editor</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Title</label>
            <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Date</label>
            <input className="input w-full" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Excerpt</label>
          <input className="input w-full" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Tags (comma-separated)</label>
          <input className="input w-full" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
          Draft
        </label>

        <div>
          <label className="block text-sm text-white/70 mb-1">Content (Markdown)</label>
          <textarea
            className="input w-full min-h-[220px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="## Hello world"
          />
          <div className="mt-3 text-white/60 text-sm">
            <span className="opacity-80">Preview:</span>
            <div className="prose prose-invert max-w-none mt-2 p-3 rounded bg-white/5 border border-white/10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-gold disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          {saveMsg && <span className="text-sm text-white/80">{saveMsg}</span>}
        </div>
      </form>
    </div>
  );
}
