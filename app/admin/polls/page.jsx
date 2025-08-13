// app/admin/polls/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function letter(i) {
  return String.fromCharCode("A".charCodeAt(0) + i);
}

export default function AdminPollsPage() {
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [editingSlug, setEditingSlug] = useState("");
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState(true);
  const [options, setOptions] = useState([{ text: "" }, { text: "" }]);

  const canSave = useMemo(
    () => title.trim() && question.trim() && options.filter(o => o.text.trim()).length >= 2,
    [title, question, options]
  );

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function basicAuthHeader() {
    // If your middleware already enforces auth, keep this or remove it everywhere consistently.
    const u = sessionStorage.getItem("adm_u") || prompt("Admin user:") || "";
    const p = sessionStorage.getItem("adm_p") || prompt("Admin pass:") || "";
    sessionStorage.setItem("adm_u", u);
    sessionStorage.setItem("adm_p", p);
    return `Basic ${btoa(`${u}:${p}`)}`;
  }

  async function refreshList() {
    try {
      setLoadingList(true);
      const res = await fetch("/api/admin/polls", { headers: { Authorization: basicAuthHeader() } });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setList(json.items || []);
    } catch (e) {
      console.error(e);
      alert("Could not load polls list");
    } finally {
      setLoadingList(false);
    }
  }

  function resetForm() {
    setEditingSlug("");
    setTitle("");
    setQuestion("");
    setDraft(true);
    setOptions([{ text: "" }, { text: "" }]);
  }

  async function loadPoll(slug) {
    try {
      const res = await fetch(`/api/admin/polls/${slug}`, { headers: { Authorization: basicAuthHeader() } });
      if (!res.ok) throw new Error("Failed to fetch poll");
      const json = await res.json();
      const p = json.item || json;
      setEditingSlug(p.slug || slug);
      setTitle(p.title || "");
      setQuestion(p.question || "");
      setDraft(!!p.draft);
      const opt = (p.options || []).map(o => ({ text: o.text || o.label || "" }));
      setOptions(opt.length >= 2 ? opt : [{ text: "" }, { text: "" }]);
    } catch (e) {
      console.error(e);
      alert("Failed to load poll");
    }
  }

  async function savePoll() {
    const slug = editingSlug || slugify(title);
    const payload = {
      slug,
      title,
      question,
      draft,
      options: options
        .map((o, i) => ({ id: letter(i).toLowerCase(), text: o.text.trim() }))
        .filter(o => o.text),
    };

    const method = editingSlug ? "PUT" : "POST";
    const url = editingSlug ? `/api/admin/polls/${editingSlug}` : "/api/admin/polls";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      alert("Save failed: " + txt);
      return;
    }
    alert("Saved");
    setEditingSlug(slug);
    refreshList();
  }

  async function deletePoll(slug) {
    if (!confirm(`Delete poll "${slug}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/polls/${slug}`, {
      method: "DELETE",
      headers: { Authorization: basicAuthHeader() },
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    if (editingSlug === slug) resetForm();
    refreshList();
  }

  function addOption() {
    setOptions(prev => [...prev, { text: "" }]);
  }

  function removeOption(i) {
    setOptions(prev => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  return (
    <div className="container py-8 grid gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Polls Admin</h1>
        <div className="text-sm opacity-70">Create, edit, publish polls for the Survivor page</div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* List */}
        <div className="md:col-span-1 card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">All Polls</h2>
            <button className="text-sm underline" onClick={refreshList}>Refresh</button>
          </div>
          {loadingList ? (
            <div className="text-white/60">Loading…</div>
          ) : (
            <ul className="space-y-2">
              {list.length === 0 && <li className="text-white/60">No polls yet</li>}
              {list.map((p) => (
                <li key={p.slug} className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => loadPoll(p.slug)}
                    className="text-left hover:underline"
                    title={p.question}
                  >
                    <div className="font-medium">{p.title || p.slug}</div>
                    <div className="text-xs text-white/60">{p.draft ? "Draft" : "Published"}</div>
                  </button>
                  <button
                    className="text-xs text-red-300 hover:text-red-200"
                    onClick={() => deletePoll(p.slug)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
          <hr className="my-4 border-white/10" />
          <button className="btn-gold w-full" onClick={resetForm}>+ New Poll</button>
        </div>

        {/* Form */}
        <div className="md:col-span-2 card p-4 grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Title</span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Slug (auto from title if empty)</span>
              <input
                className="input"
                value={editingSlug}
                onChange={(e) => setEditingSlug(slugify(e.target.value))}
                placeholder={slugify(title)}
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm">Question</span>
            <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>

          <div className="flex items-center gap-2">
            <input id="draft" type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
            <label htmlFor="draft">Draft (hide from public)</label>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Options</span>
              <button className="text-sm underline" onClick={addOption}>Add option</button>
            </div>
            <div className="grid gap-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-white/70">{letter(i)}.</span>
                  <input
                    className="input flex-1"
                    value={o.text}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOptions(prev => prev.map((op, idx) => (idx === i ? { ...op, text: v } : op)));
                    }}
                    placeholder={`Option ${letter(i)}`}
                  />
                  <button
                    className="text-xs text-white/60 hover:text-white/90"
                    onClick={() => removeOption(i)}
                    title="Remove option"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className={`btn-gold ${!canSave ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={savePoll}
              disabled={!canSave}
            >
              {editingSlug ? "Save Changes" : "Create Poll"}
            </button>
            {editingSlug && (
              <a
                className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
                href={`/survivor/${editingSlug}`}
                target="_blank"
                rel="noreferrer"
              >
                View live
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
