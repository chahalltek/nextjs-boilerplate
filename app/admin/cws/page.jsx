// app/admin/cws/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const empty = {
  slug: "",
  title: "",
  date: new Date().toISOString().slice(0, 10),
  excerpt: "",
  published: false,
  content: "",
};

export default function AdminCwsPage() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const contentRef = useRef(null);

  function normalizeSlug(s) {
    return s.toLowerCase().replace(/[^a-z0-9\-]/g, "-").replace(/--+/g, "-").replace(/^-+|-+$/g, "");
  }

  async function loadList() {
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetch("/api/admin/recaps", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(Array.isArray(data.recaps) ? data.recaps : []);
    } catch (e) {
      setListError(e.message || String(e));
    } finally {
      setLoadingList(false);
    }
  }

  async function loadOne(slug) {
    setSaveMsg("");
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        credentials: "include",
        cache: "no-store",
      });
      // If your API doesn't support GET single yet, this will fail; we fall back to list info.
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.ok && data.recap) {
          const r = data.recap;
          setForm({
            slug: r.slug || slug,
            title: r.title || "",
            date: r.date || new Date().toISOString().slice(0, 10),
            excerpt: r.excerpt || "",
            published: !!(r.published ?? r.active ?? false),
            content: r.content || "",
          });
          return;
        }
      }
      const fallback = items.find((x) => x.slug === slug);
      if (fallback) {
        setForm({
          slug: fallback.slug,
          title: fallback.title || "",
          date: fallback.date || new Date().toISOString().slice(0, 10),
          excerpt: fallback.excerpt || "",
          published: !!fallback.published,
          content: "", // unknown without GET single
        });
        setSaveMsg("ℹ️ Content not loaded (API missing GET single). You can paste new content and Save.");
      } else {
        setSaveMsg("❌ Could not load recap.");
      }
    } catch (e) {
      setSaveMsg(`❌ ${e.message || String(e)}`);
    }
  }

  useEffect(() => { loadList(); }, []);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
    return arr;
  }, [items]);

  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    if (!form.slug.trim() || !form.title.trim() || !form.content.trim()) {
      setSaveMsg("❌ Please provide slug, title, and content.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        date: form.date,
        excerpt: form.excerpt,
        published: !!form.published,
        active: !!form.published, // write both for compatibility
        content: form.content,
      };

      // Try PUT /api/admin/recaps/[slug]
      let res = await fetch(`/api/admin/recaps/${encodeURIComponent(form.slug)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Fallback to POST /api/admin/recaps if PUT unsupported
      if (res.status === 404 || res.status === 405) {
        res = await fetch("/api/admin/recaps", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: normalizeSlug(form.slug), ...payload }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `Save failed (${res.status})`);

      setSaveMsg("✅ Saved!");
      await loadList();
      contentRef.current?.focus();
    } catch (e) {
      setSaveMsg(`❌ ${e.message || String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(slug, nextPublished) {
    setSaveMsg("");
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished, active: nextPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadList();
    } catch (e) {
      alert(`Failed to update publish state: ${e.message || e}`);
    }
  }

  async function onDelete(slug) {
    if (!confirm(`Delete recap "${slug}"? This cannot be undone.`)) return;
    setSaveMsg("");
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadList();
      if (form.slug === slug) setForm(empty);
    } catch (e) {
      alert(`Failed to delete: ${e.message || e}`);
    }
  }

  function startNew() {
    setForm({ ...empty });
    setSaveMsg("");
    contentRef.current?.focus();
  }

  return (
    <div className="container max-w-6xl py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Weekly Recap — Admin</h1>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
        >
          ← Admin Home
        </Link>
      </div>

      {/* Existing recaps (now ABOVE the editor) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Existing Recaps</h2>
          <button
            onClick={startNew}
            className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
          >
            + New
          </button>
        </div>

        {loadingList && <div className="text-white/70">Loading…</div>}
        {listError && <div className="text-red-400">Error: {listError}</div>}

        {!loadingList && !listError && sorted.length === 0 && (
          <div className="text-white/70">No recaps found yet.</div>
        )}

        <div className="grid gap-3">
          {sorted.map((it) => (
            <div key={it.slug} className="card p-4 flex flex-wrap items-center gap-3">
              <button
                className="min-w-0 flex-1 text-left hover:text-white text-white/80"
                title="Edit"
                onClick={() => loadOne(it.slug)}
              >
                <div className="font-medium">
                  {it.title}{" "}
                  {it.published ? (
                    <span className="ml-2 text-xs text-emerald-400">● active</span>
                  ) : (
                    <span className="ml-2 text-xs text-yellow-300">● hidden</span>
                  )}
                </div>
                <div className="text-xs text-white/50">
                  {it.date || "no date"} • slug: <code>{it.slug}</code>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/cws/${encodeURIComponent(it.slug)}`}
                  className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                  title="View public page"
                  target="_blank"
                >
                  View
                </Link>

                <button
                  onClick={() => togglePublish(it.slug, !it.published)}
                  className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                  title={it.published ? "Unpublish (hide)" : "Publish (show)"}
                >
                  {it.published ? "Hide" : "Publish"}
                </button>

                <button
                  onClick={() => onDelete(it.slug)}
                  className="px-3 py-1.5 rounded border border-red-500/40 text-red-200 hover:bg-red-500/10 text-sm"
                  title="Delete file"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editor */}
      <form onSubmit={onSave} className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Editor</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              placeholder="2025-week-01"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: normalizeSlug(e.target.value) }))}
            />
            <p className="text-xs text-white/50 mt-1">
              File: <code>content/recaps/&lt;slug&gt;.md</code>
            </p>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Date</label>
            <input
              className="input w-full"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Title</label>
          <input
            className="input w-full"
            placeholder="Week 1 Recap — Shoulda started the kicker"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Excerpt</label>
          <input
            className="input w-full"
            placeholder="Short teaser (optional)"
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="published"
            type="checkbox"
            className="h-4 w-4"
            checked={form.published}
            onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
          />
          <label htmlFor="published" className="text-sm text-white/80">
            Published (visible on /cws)
          </label>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Content (Markdown)</label>
          <textarea
            ref={contentRef}
            className="input w-full min-h-[260px]"
            placeholder="Write your recap…"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Recap"}
          </button>
          {saveMsg && <span className="text-sm">{saveMsg}</span>}
        </div>
      </form>

      <p className="text-xs text-white/40">
        Tip: after saving/publishing, the site may rebuild automatically if a deploy hook or ISR revalidation is configured.
      </p>
    </div>
  );
}
