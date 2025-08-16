// app/admin/polls/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const emptyForm = {
  slug: "",
  question: "",
  options: ["", ""],
  active: false,
  closesAt: "",
};

export default function AdminPollsPage() {
  const [polls, setPolls] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...polls].sort((a, b) => a.slug.localeCompare(b.slug)),
    [polls]
  );

  async function loadList() {
    setLoadingList(true);
    setMsg("");
    const res = await fetch("/api/admin/polls", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = `/admin/login?from=${encodeURIComponent("/admin/polls")}`;
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setMsg(data.error || `Load failed (${res.status})`);
    } else {
      setPolls(data.polls || []);
    }
    setLoadingList(false);
  }

  useEffect(() => { loadList(); }, []);

  async function load(slug) {
    setMsg("");
    const res = await fetch(`/api/admin/polls/${encodeURIComponent(slug)}`, { credentials: "include" });
    if (res.status === 401) {
      window.location.href = `/admin/login?from=${encodeURIComponent("/admin/polls")}`;
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setMsg(data.error || `Load failed (${res.status})`);
      return;
    }
    const { poll } = data;
    setForm({
      slug: poll.slug,
      question: poll.question || "",
      options: (poll.options || []).map(o => (typeof o === "string" ? o : o.label || "")),
      active: !!poll.active,
      closesAt: poll.closesAt || "",
    });
  }

  function setOption(idx, val) {
    setForm(f => {
      const next = [...f.options];
      next[idx] = val;
      return { ...f, options: next };
    });
  }

  function addOption() {
    setForm(f => ({ ...f, options: [...f.options, ""] }));
  }

  async function save(e) {
    e.preventDefault();
    setMsg("");
    setSaving(true);

    const payload = {
      question: form.question,
      options: form.options.filter(Boolean).map(s => ({ label: s })),
      active: !!form.active,
      closesAt: form.closesAt || null,
    };

    const res = await fetch(`/api/admin/polls/${encodeURIComponent(form.slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      if (res.status === 401) {
        window.location.href = `/admin/login?from=${encodeURIComponent("/admin/polls")}`;
        return;
      }
      setMsg(data.error || `Save failed (${res.status})`);
    } else {
      setMsg("✅ Saved!");
      loadList();
    }
    setSaving(false);
  }

  async function makeActive(slug) {
    setMsg("");
    const res = await fetch(`/api/admin/polls/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question: form.question || "(unchanged)", options: form.options.filter(Boolean).map(s => ({ label: s })), active: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { setMsg(data.error || `Activate failed (${res.status})`); return; }
    setMsg("✅ Activated");
    loadList();
  }

  async function archive(slug) {
    setMsg("");
    // set active:false by PUT with minimal payload (question/options required)
    const resLoad = await fetch(`/api/admin/polls/${encodeURIComponent(slug)}`, { credentials: "include" });
    const cur = await resLoad.json().catch(() => ({}));
    if (!resLoad.ok || !cur.ok) { setMsg(cur.error || `Load failed (${resLoad.status})`); return; }

    const res = await fetch(`/api/admin/polls/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        question: cur.poll.question,
        options: (cur.poll.options || []).map(o => (typeof o === "string" ? { label: o } : o)),
        active: false,
        closesAt: cur.poll.closesAt || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { setMsg(data.error || `Archive failed (${res.status})`); return; }
    setMsg("✅ Archived");
    loadList();
  }

  async function remove(slug) {
    if (!confirm(`Delete poll "${slug}"? This cannot be undone.`)) return;
    setMsg("");
    const res = await fetch(`/api/admin/polls/${encodeURIComponent(slug)}`, {
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
        <h1 className="text-2xl font-bold">Admin — Survivor</h1>
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
          <div className="text-lg font-semibold mb-2">Existing polls</div>
          {loadingList ? (
            <div className="text-white/60">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="text-white/60">No polls yet.</div>
          ) : (
            <ul className="space-y-1">
              {sorted.map(p => (
                <li key={p.slug} className="flex items-center justify-between gap-2">
                  <button
                    className="text-left flex-1 py-1 hover:text-white text-white/80"
                    onClick={() => load(p.slug)}
                  >
                    {p.slug} {p.active && <span className="ml-2 text-xs text-emerald-400">● active</span>}
                  </button>
                  {p.active ? (
                    <button
                      className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20"
                      onClick={() => archive(p.slug)}
                      title="Set inactive"
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20"
                      onClick={() => makeActive(p.slug)}
                      title="Set active"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20"
                    onClick={() => remove(p.slug)}
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
                setForm(f => ({
                  ...f,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\-]/g, "-")
                    .replace(/--+/g, "-"),
                }))
              }
              placeholder="week-1"
            />
            <p className="text-xs text-white/50 mt-1">Saved as <code>data/polls/&lt;slug&gt;.json</code></p>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Question</label>
            <input
              className="input w-full"
              value={form.question}
              onChange={(e) => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="Who wins this week?"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Options</label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <input
                  key={i}
                  className="input w-full"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                />
              ))}
              <button type="button" onClick={addOption} className="px-3 py-1.5 rounded border border-white/20 text-white/80 hover:text-white hover:bg-white/10">
                + Add option
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            Make active after save
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !form.slug || !form.question || form.options.filter(Boolean).length < 2}
              className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Poll"}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
