// app/admin/posts/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPostsPage() {
  const router = useRouter();

  // form fields
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // ui state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [loadingPost, setLoadingPost] = useState(false);

  // existing posts
  const [posts, setPosts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState("");

  const fileInputRef = useRef(null);

  // load list
  useEffect(() => {
    (async () => {
      setLoadingList(true);
      setListErr("");
      try {
        const res = await fetch("/api/admin/posts", { credentials: "include" });
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || `List failed (${res.status})`);
        setPosts(data.posts || []);
      } catch (e) {
        setListErr(String(e?.message || e));
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

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

      setCoverUrl(data.url); // public path: /uploads/YYYY/filename
      setUploadMsg("✅ Uploaded! (copied below)");
    } catch (err) {
      setUploadMsg(`❌ ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function loadPost(s) {
    if (!s) return;
    setLoadingPost(true);
    setSaveMsg(""); setCommitSha("");
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(s)}`, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Load failed (${res.status})`);
      const p = data.data || {};
      setSlug(p.slug || s);
      setTitle(p.title || "");
      setExcerpt(p.excerpt || "");
      setDate(p.date || "");
      setContent(p.content || "");
      setCoverUrl(""); // not embedded; we keep as separate helper
      setUploadMsg("");
      setSaveMsg("");
    } catch (e) {
      setSaveMsg(`❌ ${String(e?.message || e)}`);
    } finally {
      setLoadingPost(false);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setSaveMsg(""); setCommitSha("");
    if (!slug.trim()) return setSaveMsg("❌ Please provide a slug.");
    if (!title.trim() || !content.trim()) return setSaveMsg("❌ Please provide a title and content.");

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
      setSaveMsg("✅ Saved! Redirecting…");
      // redirect to the post
      setTimeout(() => router.push(`/blog/${slug}`), 800);
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container max-w-5xl py-10 grid md:grid-cols-3 gap-6">
      {/* Left: list */}
      <aside className="md:col-span-1 card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Existing posts</h2>
          <Link href="/admin" className="text-sm text-white/70 hover:text-white">← Admin</Link>
        </div>
        {loadingList ? (
          <p className="text-white/60 text-sm">Loading…</p>
        ) : listErr ? (
          <p className="text-red-400 text-sm">{listErr}</p>
        ) : posts.length === 0 ? (
          <p className="text-white/60 text-sm">No posts yet.</p>
        ) : (
          <ul className="space-y-1 max-h-[60vh] overflow-auto">
            {posts.map((p) => (
              <li key={p.slug}>
                <button
                  onClick={() => loadPost(p.slug)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-white/10"
                  disabled={loadingPost}
                >
                  {p.slug}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Right: editor */}
      <main className="md:col-span-2">
        <form onSubmit={onSave} className="space-y-5">
          <div className="card p-5">
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              placeholder="my-first-post"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, "-").replace(/--+/g, "-")
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
              <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Excerpt</label>
              <input className="input w-full" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Date</label>
              <input className="input w-full" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onPickFile} className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10">
                Upload image
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
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
                className="input w-full min-h-[280px]"
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
            {commitSha && <span className="text-xs text-white/50">commit: {commitSha.slice(0, 7)}</span>}
          </div>
        </form>
      </main>
    </div>
  );
}
