// app/admin/posts/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

function chipColor(status) {
  if (status === "active") return "text-emerald-400";
  if (status === "scheduled") return "text-sky-400";
  return "text-white/50";
}

function computeStatus(post) {
  // post: { draft?: boolean, publishAt?: string }
  if (post?.draft) return "inactive";
  if (post?.publishAt) {
    const t = Date.parse(post.publishAt);
    if (!Number.isNaN(t) && t > Date.now()) return "scheduled";
  }
  return "active";
}

export default function AdminPostsPage() {
  // ---------- list state ----------
  const [list, setList] = useState([]); // [{slug,title,draft?,publishAt?,date?}, ...]
  const [loadingList, setLoadingList] = useState(false);
  const [listMsg, setListMsg] = useState("");
  const [q, setQ] = useState("");

  // ---------- editor state ----------
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState("");
  const [draft, setDraft] = useState(false);
  const [publishAt, setPublishAt] = useState(""); // datetime-local
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const fileInputRef = useRef(null);

  // ---------- list fetch ----------
  async function loadList() {
    setLoadingList(true);
    setListMsg("");
    try {
      const res = await fetch("/api/admin/posts?list=1", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Expect data.posts: [{slug,title,draft?,publishAt?,date?}, ...]
      setList(Array.isArray(data.posts) ? data.posts : []);
    } catch (err) {
      setListMsg(`❌ ${err.message || "Failed to load"}`);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return list;
    return list.filter((p) =>
      [p.title, p.slug, p.excerpt]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(qq))
    );
  }, [list, q]);

  // ---------- file upload ----------
  function onPickFile() {
    fileInputRef.current?.click();
  }
  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveMsg("Uploading image…");
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
      setSaveMsg("✅ Image uploaded");
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ---------- helpers ----------
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
    // yyyy-MM-ddThh:mm
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function resetEditor(newSlug = "") {
    setSlug(newSlug);
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
  }

  // ---------- row actions ----------
  async function onEdit(slugToLoad) {
    setSaveMsg("Loading post…");
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slugToLoad)}?raw=1`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
          return;
        }
        throw new Error(data.error || `Load failed (${res.status})`);
      }
      // Expect shape similar to what the PUT endpoint accepts
      setSlug(data.slug || slugToLoad);
      setTitle(data.title || "");
      setExcerpt(data.excerpt || "");
      setDate(data.date || "");
      setContent(data.content || "");
      setCoverUrl(data.coverUrl || "");
      setTags(Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || ""));
      setDraft(Boolean(data.draft));
      setPublishAt(fromIsoToLocal(data.publishAt || ""));
      setSaveMsg("✅ Loaded");
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    }
  }

  async function onDelete(slugToDelete) {
    if (!confirm(`Delete "${slugToDelete}" permanently? This cannot be undone.`)) return;
    setListMsg("Deleting…");
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slugToDelete)}`, {
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
      setList((prev) => prev.filter((p) => p.slug !== slugToDelete));
      if (slug === slugToDelete) resetEditor();
      setListMsg("✅ Deleted");
    } catch (err) {
      setListMsg(`❌ ${err.message}`);
    }
  }

  async function onToggleVisibility(row) {
    // Hide => set draft:true ; Show => draft:false
    const nextDraft = !computeStatus(row) || computeStatus(row) === "active" ? true : row.draft ? false : true;
    // Simpler: flip row.draft
    const desired = !row.draft;

    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(row.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ draft: desired }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/posts")}`;
          return;
        }
        throw new Error(data.error || `Update failed (${res.status})`);
      }
      // Refresh list entry locally
      setList((prev) =>
        prev.map((p) => (p.slug === row.slug ? { ...p, draft: desired } : p))
      );
    } catch (err) {
      alert(err.message || "Failed to update visibility");
    }
  }

  // ---------- save ----------
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
          tags: tags || undefined, // comma-separated ok
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
      setSaveMsg("✅ Saved");

      // Update/insert row in list
      setList((prev) => {
        const row = {
          slug,
          title,
          draft,
          publishAt: toIsoIfSet(publishAt) || undefined,
          date: date || undefined,
        };
        const i = prev.findIndex((p) => p.slug === slug);
        if (i >= 0) {
          const copy = prev.slice();
          copy[i] = { ...copy[i], ...row };
          return copy;
        }
        return [row, ...prev];
      });
    } catch (err) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container max-w-5xl py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Blog — Admin</h1>
        <Link href="/admin" className="px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10">
          ← Admin Home
        </Link>
      </div>

      {/* Existing posts (list) */}
      <section className="rounded-xl border border-white/10 bg-white/5">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts…"
            className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
          />
          <button onClick={loadList} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
            Refresh
          </button>
        </div>

        <div className="divide-y divide-white/10">
          {loadingList && <div className="p-4 text-sm text-white/60">Loading…</div>}
          {!loadingList && filtered.length === 0 && (
            <div className="p-4 text-sm text-white/60">No posts yet.</div>
          )}

          {filtered.map((p) => {
            const status = computeStatus(p);
            const showButtonLabel = p.draft ? "Show" : "Hide";
            return (
              <div key={p.slug} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.title || p.slug}</div>
                  <div className={`text-xs mt-0.5 ${chipColor(status)}`}>{status}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleVisibility(p)}
                    className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 text-sm"
                  >
                    {showButtonLabel}
                  </button>
                  <button
                    onClick={() => onEdit(p.slug)}
                    className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(p.slug)}
                    className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 text-sm text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {listMsg && <div className="p-3 text-xs text-white/60 border-t border-white/10">{listMsg}</div>}
      </section>

      {/* Create / Edit form */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Create / Edit Post</h2>

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

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-white/70 mb-1">Date</label>
                <input
                  className="input w-full"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 align-middle"
                  checked={draft}
                  onChange={(e) => setDraft(e.target.checked)}
                />
                <span className="text-sm text-white/70">Inactive (hide from blog)</span>
              </label>
              <div>
                <label className="block text-sm text-white/70 mb-1">Publish at</label>
                <input
                  className="input w-full"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
                <p className="text-xs text-white/40 mt-1">Set a future time to schedule.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Tags (comma-separated)</label>
              <input
                className="input w-full"
                placeholder="vikings, injuries, qb"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
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
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
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
            {commitSha && <span className="text-xs text-white/50">commit: {commitSha.slice(0, 7)}</span>}
            <button
              type="button"
              onClick={() => resetEditor("")}
              className="ml-auto px-3 py-2 rounded border border-white/20 text-white hover:bg-white/10"
            >
              New Post
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
