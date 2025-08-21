// app/admin/cws/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const emptyForm = {
  slug: "",
  title: "",
  excerpt: "",
  date: "",
  content: "",
  draft: false,
  active: true,
  publishAt: "", // datetime-local
  coverUrl: "",
};

export default function AdminCwsPage() {
  const [recaps, setRecaps] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const fileInputRef = useRef(null);

  const sorted = useMemo(
    () => [...recaps].sort((a, b) => a.slug.localeCompare(b.slug)),
    [recaps]
  );

  function toIsoIfSet(dtLocal) {
    if (!dtLocal) return "";
    const d = new Date(dtLocal.replace(" ", "T"));
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  async function loadList() {
    setLoadingList(true);
    setMsg("");
    const res = await fetch("/api/admin/recaps", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setMsg(data.error || `Load failed (${res.status})`);
    } else {
      setRecaps(data.recaps || []);
    }
    setLoadingList(false);
  }

  useEffect(() => { loadList(); }, []);

  async function load(slug) {
    setMsg("");
    const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, { credentials: "include" });
    if (res.status === 401) {
      window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setMsg(data.error || `Load failed (${res.status})`);
      return;
    }
    const { recap } = data;
    // Accept either 'active' or legacy 'published' flags
    const active =
      recap.active ?? (recap.published !== false);

    setForm({
      slug: recap.slug,
      title: recap.title || "",
      excerpt: recap.excerpt || "",
      date: recap.date || "",
      content: recap.content || "",
      draft: !!recap.draft,
      active: !!active,
      publishAt: recap.publishAt ? recap.publishAt.replace("Z", "") : "",
      coverUrl: recap.coverUrl || "",
    });
    setCommitSha("");
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
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
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
          return;
        }
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      setField("coverUrl", data.url);
      setUploadMsg("✅ Uploaded! (copied below)");
    } catch (err) {
      setUploadMsg(`❌ ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save(e) {
    e.preventDefault();
    setMsg("");
    setCommitSha("");

    if (!form.slug.trim()) return setMsg("❌ Please provide a slug.");
    if (!form.title.trim() || !form.content.trim()) return setMsg("❌ Please provide a title and content.");

    setSaving(true);
    try {
      const contentWithCover = form.coverUrl
        ? `![cover image](${form.coverUrl})\n\n${form.content}`
        : form.content;

      const payload = {
        title: form.title,
        excerpt: form.excerpt || undefined,
        content: contentWithCover,
        date: form.date || undefined,
        draft: !!form.draft,
        active: !!form.active,
        // write published too for legacy consumers
        published: !!form.active,
        publishAt: toIsoIfSet(form.publishAt) || undefined,
        coverUrl: form.coverUrl || undefined,
      };

      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(form.slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
          return;
        }
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setCommitSha(data.commit || "");
      setMsg("✅ Saved!");
      loadList();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function makeActive(slug) {
    setMsg("");
    // Load current, then PUT with active:true
    const curRes = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, { credentials: "include" });
    const cur = await curRes.json().catch(() => ({}));
    if (!curRes.ok || !cur.ok) { setMsg(cur.error || `Load failed (${curRes.status})`); return; }

    const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...cur.recap,
        active: true,
        published: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { setMsg(data.error || `Activate failed (${res.status})`); return; }
    setMsg("✅ Activated");
    loadList();
  }

  async function hide(slug) {
    setMsg("");
    const curRes = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, { credentials: "include" });
    const cur = await curRes.json().catch(() => ({}));
    if (!curRes.ok || !cur.ok) { setMsg(cur.error || `Load failed (${curRes.status})`); return; }

    const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...cur.recap,
        active: false,
        published: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { setMsg(data.error || `Hide failed (${res.status})`); return; }
    setMsg("✅ Hidden");
    loadList();
  }

  async function remove(slug) {
    if (!confirm(`Delete recap "${slug}"? This cannot be undone.`)) return;
    setMsg("");
    const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { setMsg(data.error || `Delete failed (${res.status})`); return; }
    setMsg("🗑️ Deleted");
    setForm(emptyForm);
    loadList();
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin — CWS</h1>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20"
        >
          <span aria-hidden>←</span> Admin Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
        {/* Left: list */}
        <div className="card p-4 min-h-[320px]">
          <div className="text-lg font-semibold mb-2">Existing recaps</div>
          {loadingList ? (
            <div className="text-white/60">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="text-white/60">No recaps yet.</div>
          ) : (
            <ul className="space-y-1">
              {sorted.map((r) => (
                <li key={r.slug} className="flex items-center justify-between gap-2">
                  <button
                    className="text-left flex-1 py-1 hover:text-white text-white/80"
                    onClick={() => load(r.slug)}
                    title="Edit"
                  >
                    {r.slug} {r.active !== false && r.published !== false && (
                      <span className="ml-2 text-xs text-emerald-400">● active</span>
                    )}
                  </button>
                  {r.active !== false && r.published !== false ? (
                    <button
                      className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20"
                      onClick={() => hide(r.slug)}
                      title="Set inactive"
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20"
                      onClick={() => makeActive(r.slug)}
                      title="Set active"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20"
                    onClick={() => remove(r.slug)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: editor */}
        <form onSubmit={save} className="card p-4 space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              value={form.slug}
              onChange={(e) =>
                setField(
                  "slug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, "-").replace(/--+/g, "-")
                )
              }
              placeholder="week-1"
            />
            <p className="text-xs text-white/50 mt-1">
              Saved as <code>content/recaps/&lt;slug&gt;.md</code>
            </p>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Title</label>
            <input
              className="input w-full"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Week 1 — Coulda Woulda Shoulda"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Date</label>
              <input
                className="input w-full"
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm mt-7 sm:mt-0">
              <input
                type="checkbox"
                checked={form.draft}
                onChange={(e) => setField("draft", e.target.checked)}
              />
              Draft
            </label>
            <div>
              <label className="block text-sm text-white/70 mb-1">Publish at</label>
              <input
                className="input w-full"
                type="datetime-local"
                value={form.publishAt}
                onChange={(e) => setField("publishAt", e.target.value)}
              />
              <p className="text-xs text-white/40 mt-1">Future time to auto-publish.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Excerpt</label>
            <input
              className="input w-full"
              value={form.excerpt}
              onChange={(e) => setField("excerpt", e.target.value)}
              placeholder="Short summary (optional)"
            />
          </div>

          {/* Upload cover */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPickFile}
                className="px-3 py-1.5 rounded border border-white/20 text-white/80 hover:text-white hover:bg-white/10"
              >
                Upload image
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              {uploadMsg && <span className="text-sm text-white/70">{uploadMsg}</span>}
            </div>
            {form.coverUrl && (
              <div className="text-sm">
                <div className="text-white/70">Image URL:</div>
                <code className="break-all">{form.coverUrl}</code>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Content (Markdown)</label>
            <textarea
              className="input w-full min-h-[240px]"
              value={form.content}
              onChange={(e) => setField("content", e.target.value)}
              placeholder="Write your recap…"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField("active", e.target.checked)}
            />
            Active (visible)
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !form.slug || !form.title || !form.content}
              className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Recap"}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
            {commitSha && <span className="text-xs text-white/50">commit: {commitSha.slice(0,7)}</span>}
          </div>

          <p className="text-xs text-white/40">Tip: future “Publish at” times will auto-publish via Vercel Cron.</p>
        </form>
      </div>
    </div>
  );
}
