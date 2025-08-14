"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [draft, setDraft] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    const body = {
      title: title.trim(),
      slug: (slug || slugify(title)).trim(),
      excerpt,
      draft,
      content,
    };

    if (!body.title || !body.slug) {
      alert("Title and slug are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include", // send admin_session cookie
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Save failed (${res.status})`);
      }
      alert("Saved!");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-10 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Admin — Write a Post</h1>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70">Title</label>
            <input
              className="input w-full text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Slug</label>
            <input
              className="input w-full text-white"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-from-title if left blank"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70">Excerpt</label>
            <textarea
              className="input w-full h-20 text-white"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One or two sentences"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
            />
            Mark as draft
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded border border-white/20 bg-white/10 text-white hover:bg-white/15 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {/* You can add Delete/Upload buttons here as needed */}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-white/70">Markdown</label>
          <textarea
            className="input w-full h-80 md:h-[28rem] text-white"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Hello world"
          />
        </div>
      </form>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Preview</h2>
        <article className="prose prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || "_Nothing to preview yet…_"}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
