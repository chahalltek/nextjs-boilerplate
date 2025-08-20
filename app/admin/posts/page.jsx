// app/admin/posts/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export default function AdminPostsPage() {
  // form fields
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // NEW
  const [tags, setTags] = useState("");
  const [draft, setDraft] = useState(false);
  const [publishAt, setPublishAt] = useState(""); // HTML datetime-local (local timezone)

  // list + UI state
  const [posts, setPosts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) =>
      [p.slug, p.title, p.excerpt, p.tags?.join(",")].join(" ").toLowerCase().includes(q)
    );
  }, [posts, filter]);

  const isExisting = useMemo(
    () => posts.some((p) => p.slug === slug),
    [posts, slug]
  );

  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    setListLoading(true);
    setListError("");
    try {
      const res = await fetch("/api/admin/posts?list=1", { credentials: "include", cache: "no-store" });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `List failed (${res.status})`);
      setPosts(data.posts || []);
    } catch (err) {
      setListError(err?.message || "Failed to load posts");
    } finally {
      setListLoading(false);
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
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd, credentials: "include" });
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

  function toIsoIfSet(dtLocal) {
    if (!dtLocal) return "";
    const d = new Date(dtLocal.replace(" ", "T"));
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  function fromIsoToLocal(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    // yyyy-MM-ddThh:mm for datetime-local
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function clearForm() {
    setSlug("");
    setTitle("");
    setExcerpt("");
    setDate("");
    setContent("");
    setCoverUrl("");
    setTags("");
    setDraft(false);
    setPublishAt("");
    setCommitSha("");
    setSaveMsg("");
    setSelectedSlug("");
  }

  function parseCoverFromContent(md) {
    // If content starts with a cover image markdown, extract it: ![...](url)
    const lines = (md || "").split("\n");
    if (lines.length === 0) return { cover: "", body: md };
    const first = lines[0].trim();
    const m = first.match(/^!\[[^\]]*\]\(([^)]+)\)/);
    if (m) {
      const cover = m[1];
      const body = lines.slice(2).join("\n"); // drop image line and one blank line that editor added
      return { cover, body };
    }
    return { cover: "", body: md };
  }

  async function loadForEdit(slugToLoad) {
    setSaveMsg("");
    setCommitSha("");
    setSelectedSlug(slugToLoad);
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slugToLoad)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `Load failed (${res.status})`);

      const p = data.post || {};
      setSlug(p.slug || slugToLoad);
      setTitle(p.title || "");
      setExcerpt(p.excerpt || "");
      setDate((p.date || "").slice(0, 10));
      setDraft(Boolean(p.draft));
      setTags(Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || ""));
      setPublishAt(fromIsoToLocal(p.publishAt || ""));

      // content / cover extraction fallback
      let c = p.content || "";
      let inferredCover = p.coverUrl || "";
      if (!inferredCover) {
        const parsed = parseCoverFromContent(c);
        if (parsed.cover) {
          inferredCover = parsed.cover;
          c = parsed.body;
        }
      }
      setCoverUrl(inferredCover);
      setContent(c);
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    setCommitSha("");
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
          tags: tags || undefined,           // comma-separated OK
          draft,
          publishAt: toIsoIfSet(publishAt) || undefined,
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
      await loadList(); // refresh list (title/dates may change)
      setSelectedSlug(slug);
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!slug) return;
    if (!confirm(`Delete post “${slug}”? This will commit a removal in content/posts.`)) return;
    setDeleting(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
          return;
        }
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      setSaveMsg("🗑️ Deleted.");
      clearForm();
      await loadList();
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Blog — Admin</h1>
        <Link href="/admin" className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10">← Admin Home</Link>
      </div>

      <div className="grid md:grid-cols-[320px,1fr] gap-6">
        {/* LEFT: List */}
        <aside className="rounded-xl border border-white/10 bg-white/5">
          <div className="p-3 border-b border-white/10">
            <input
              className="input w-full"
              placeholder="Search posts…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="max-h-[60vh] overflow-auto">
            {listLoading && <div className="p-3 text-sm text-white/60">Loading…</div>}
            {listError && <div className="p-3 text-sm text-red-400">❌ {listError}</div>}
            {!listLoading && !listError && filtered.length === 0 && (
              <div className="p-3 text-sm text-white/60">No posts found.</div>
            )}
            <ul className="divide-y divide-white/10">
              {filtered.map((p) => (
                <li key={p.slug}>
                  <button
                    className={`w-full text-left p-3 hover:bg-white/10 ${selectedSlug === p.slug ? "bg-white/10" : ""}`}
                    onClick={() => loadForEdit(p.slug)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{p.title || p.slug}</div>
                      {p.draft && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/10">Draft</span>}
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">
                      {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                      {p.publishAt ? ` • Publishes ${new Date(p.publishAt).toLocaleString()}` : ""}
                    </div>
                    <div className="text-[11px] text-white/40 truncate">{p.slug}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 border-t border-white/10 flex gap-2">
            <button
              className="px-3 py-2 rounded border border-white/20 hover:bg-white/10"
              onClick={clearForm}
              title="Start a new post"
            >
              New Post
            </button>
            <button
              className="px-3 py-2 rounded border border-white/20 hover:bg-white/10"
              onClick={loadList}
              title="Refresh list"
            >
              Refresh
            </button>
          </div>
        </aside>

        {/* RIGHT: Editor */}
        <form onSubmit={onSave} className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{isExisting ? "Edit Post" : "Create Post"}</h2>
            <div className="flex items-center gap-2">
              {slug && (
                <Link
                  href={`/blog/${slug}`}
                  className="px-3 py-2 rounded border border-white/20 hover:bg-white/10"
                  target="_blank"
                >
                  View
                </Link>
              )}
              {isExisting && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="px-3 py-2 rounded border border-red-400/40 text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </div>

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
              File path: <code>content/posts/&lt;slug&gt;.md</code>
            </p>
          </div>

          <div className="card p-5 space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Title</label>
              <input className="input w-full" placeholder="Post title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Excerpt</label>
              <input className="input w-full" placeholder="Short summary (optional)" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-white/70 mb-1">Date</label>
                <input className="input w-full" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="draft"
                  type="checkbox"
                  className="h-4 w-4 align-middle"
                  checked={draft}
                  onChange={(e) => setDraft(e.target.checked)}
                />
                <label htmlFor="draft" className="text-sm text-white/70">Draft (hidden)</label>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Publish at</label>
                <input
                  className="input w-full"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
                <p className="text-xs text-white/40 mt-1">Set a future time to auto-publish.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Tags (comma-separated)</label>
              <input className="input w-full" placeholder="vikings, injuries, qb" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onPickFile} className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10">Upload image</button>
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
            {commitSha && <span className="text-xs text-white/50">commit: {commitSha.slice(0, 7)}</span>}
          </div>

          <p className="text-xs text-white/40">
            Tip: future “Publish at” times will auto-publish via Vercel Cron.
          </p>
        </form>
      </div>
    </div>
  );
}
