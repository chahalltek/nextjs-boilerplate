// app/admin/cws/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export default function AdminCwsPage() {
  // ---------- list state ----------
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  // ---------- editor state ----------
  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const contentRef = useRef(null);

  // ---------- helpers ----------
  function normalizeSlug(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function resetForm() {
    setEditing(false);
    setSlug("");
    setTitle("");
    setExcerpt("");
    setContent("");
    setPublished(false);
    setDate(new Date().toISOString().slice(0, 10));
    setSaveMsg("");
    contentRef.current?.focus();
  }

  // ---------- load list ----------
  async function load() {
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetch("/api/admin/recaps", {
        credentials: "include",
        cache: "no-store",
      });
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

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => (b.date || b.slug).localeCompare(a.date || a.slug));
    return arr;
  }, [items]);

  // ---------- actions ----------
  async function togglePublish(slug, nextPublished) {
    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await load();
    } catch (e) {
      alert(`Failed to update publish state: ${e.message || e}`);
    }
  }

  async function onDelete(slug) {
    if (!confirm(`Delete recap "${slug}"? This cannot be undone.`)) return;
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
      await load();
    } catch (e) {
      alert(`Failed to delete: ${e.message || e}`);
    }
  }

  // Prefill editor with full content via API
  async function startEdit(it) {
    setSaveMsg("");
    setEditing(true);
    setSlug(it.slug);
    setTitle(it.title || "");
    setDate(it.date || new Date().toISOString().slice(0, 10));
    setExcerpt(it.excerpt || "");
    setPublished(!!it.published);
    setContent(""); // temporary while fetching

    try {
      const res = await fetch(`/api/admin/recaps/${encodeURIComponent(it.slug)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const d = data.data || {};
      if (d.slug) setSlug(d.slug);
      if (d.title) setTitle(d.title);
      if (d.date) setDate(d.date);
      if (typeof d.published === "boolean") setPublished(d.published);
      if (d.excerpt != null) setExcerpt(d.excerpt);
      setContent(d.content || "");
      contentRef.current?.focus();
    } catch (e) {
      setSaveMsg(`❌ Failed to load content for edit: ${e.message || e}`);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setSaveMsg("");
    if (!slug.trim() || !title.trim() || !content.trim()) {
      setSaveMsg("❌ Please provide slug, title, and content.");
      return;
    }
    setSaving(true);
    try {
      let res, data;
      if (editing) {
        res = await fetch(`/api/admin/recaps/${encodeURIComponent(slug)}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, date, excerpt, published, content }),
        });
      } else {
        res = await fetch("/api/admin/recaps", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: normalizeSlug(slug),
            title,
            date,
            excerpt,
            published,
            content,
          }),
        });
      }
      data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/cws")}`;
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `Save failed (${res.status})`);
      setSaveMsg("✅ Saved! (Git commit created)");
      await load();
      if (!editing) resetForm();
    } catch (e) {
      setSaveMsg(`❌ ${e.message || String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  // ---------- formatting toolbar helpers ----------
  const btn =
    "rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 bg-black/20";

  function insertAround(before, after = "", placeholder = "text") {
    const ta = contentRef.current;
    if (!ta) return;
    const s = ta.selectionStart ?? 0;
    const e = ta.selectionEnd ?? 0;
    const sel = (content || "").slice(s, e) || placeholder;
    const next = (content || "").slice(0, s) + before + sel + after + (content || "").slice(e);
    setContent(next);
    queueMicrotask(() => {
      ta.focus();
      const pos = s + before.length + sel.length + after.length;
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }

  function insertPlain(str) {
    const ta = contentRef.current;
    if (!ta) return;
    const s = ta.selectionStart ?? 0;
    const e = ta.selectionEnd ?? 0;
    const next = (content || "").slice(0, s) + str + (content || "").slice(e);
    setContent(next);
    queueMicrotask(() => {
      ta.focus();
      const pos = s + str.length;
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }

  // ---------- live preview ----------
  function renderPreview(md = "") {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let inList = false;

    const flushList = () => {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    };

    for (const raw of lines) {
      const l = raw.trimEnd();

      if (!l.trim()) {
        flushList();
        html += "<br/>";
        continue;
      }

      if (l === "---") {
        flushList();
        html += '<hr class="my-3 border-white/20" />';
        continue;
      }

      if (l.startsWith("### ")) {
        flushList();
        html += `<h3 class="font-semibold mt-3 mb-1">${escapeHtml(l.slice(4))}</h3>`;
        continue;
      }
      if (l.startsWith("## ")) {
        flushList();
        html += `<h2 class="text-lg font-semibold mt-4 mb-2">${escapeHtml(l.slice(3))}</h2>`;
        continue;
      }
      if (l.startsWith("# ")) {
        flushList();
        html += `<h1 class="text-xl font-semibold mb-2">${escapeHtml(l.slice(2))}</h1>`;
        continue;
      }

      if (l.startsWith("- ")) {
        if (!inList) {
          html += '<ul class="list-disc ml-5 space-y-1">';
          inList = true;
        }
        html += `<li>${escapeInline(l.slice(2))}</li>`;
        continue;
      }

      flushList();
      html += `<p class="opacity-80">${escapeInline(l)}</p>`;
    }
    flushList();
    return html;
  }

  // allow simple inline markdown like [text](url) and keep <u>…</u>
  function escapeInline(s) {
    // basic link [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t, u) => {
      return `<a class="underline" href="${u}" target="_blank" rel="noreferrer">${escapeHtml(t)}</a>`;
    });
    // keep <u>…</u> for underline but escape other tags
    // temporarily protect underline
    s = s.replace(/<u>/g, "%%U1%%").replace(/<\/u>/g, "%%U2%%");
    s = escapeHtml(s);
    return s.replace(/%%U1%%/g, "<u>").replace(/%%U2%%/g, "</u>");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const previewHtml = renderPreview(content);

  // ---------- UI ----------
  return (
    <div className="container max-w-5xl py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Weekly Recap — Admin</h1>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
        >
          ← Admin Home
        </Link>
      </div>

      {/* Existing recaps */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Existing Recaps</h2>
          <button
            onClick={resetForm}
            className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            title="Start a new recap"
          >
            + New recap
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
              <div className="min-w-0 flex-1">
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-white/50">
                  {it.date || "no date"} • slug: <code>{it.slug}</code> •{" "}
                  {it.published ? (
                    <span className="text-green-400">active</span>
                  ) : (
                    <span className="text-yellow-300">draft</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublish(it.slug, !it.published)}
                  className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                  title={it.published ? "Hide (unpublish)" : "Activate (publish)"}
                >
                  {it.published ? "Hide" : "Activate"}
                </button>

                <button
                  onClick={() => startEdit(it)}
                  className="px-3 py-1.5 rounded border border-white/20 text-white hover:bg-white/10 text-sm"
                  title="Edit this recap"
                >
                  Edit
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing ? "Edit Recap" : "Create Recap"}</h2>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Slug</label>
            <input
              className="input w-full"
              placeholder="2025-week-01"
              value={slug}
              onChange={(e) => setSlug(normalizeSlug(e.target.value))}
            />
            <p className="text-xs text-white/50 mt-1">
              File is saved as <code>content/recaps/&lt;slug&gt;.md</code>. Changing the slug will
              create a new file.
            </p>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Date</label>
            <input
              className="input w-full"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Title</label>
          <input
            className="input w-full"
            placeholder="Week 1 Recap — Shoulda started the kicker"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1">Excerpt</label>
          <input
            className="input w-full"
            placeholder="Short teaser for the archive tiles (optional)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="published"
            type="checkbox"
            className="h-4 w-4"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <label htmlFor="published" className="text-sm text-white/80">
            Published (visible on /cws)
          </label>
        </div>

        {/* Formatting toolbar (sticky) */}
        <div className="sticky top-0 z-10 -mx-5 px-5 py-2 bg-[#120F1E]/95 backdrop-blur border-y border-white/10">
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" className={btn} onClick={() => insertAround("**", "**")}>
              Bold
            </button>
            <button type="button" className={btn} onClick={() => insertAround("_", "_")}>
              Italics
            </button>
            <button type="button" className={btn} onClick={() => insertAround("<u>", "</u>")}>
              Underline
            </button>
            <button type="button" className={btn} onClick={() => insertAround("## ", "")}>
              H2
            </button>
            <button type="button" className={btn} onClick={() => insertAround("- ", "")}>
              List
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => insertAround("[", "](https://)", "link text")}
            >
              Link
            </button>
            <button type="button" className={btn} onClick={() => insertPlain("\n\n")}>
              ¶ Break
            </button>
            <button type="button" className={btn} onClick={() => insertPlain("\n\n---\n\n")}>
              HR
            </button>
          </div>
        </div>

        {/* Split pane: editor (left) + preview (right) */}
        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1 text-sm">
            <span className="text-white/70">Content (Markdown)</span>
            <textarea
              ref={contentRef}
              className="input w-full min-h-[360px] font-mono text-sm"
              placeholder="Write your recap in Markdown…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>

          <div className="rounded-lg border border-white/10 p-3 bg-black/20">
            <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Preview</div>
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Save Recap"}
          </button>
          {saveMsg && <span className="text-sm">{saveMsg}</span>}
        </div>
      </form>

      <p className="text-xs text-white/40">
        Tip: after saving/publishing, the site may redeploy automatically if a Deploy Hook is
        configured.
      </p>
    </div>
  );
}
