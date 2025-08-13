"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function basicAuth() {
  // If you already attach Authorization globally, swap this.
  const u = prompt("Admin user:") || "";
  const p = prompt("Admin pass:") || "";
  return `Basic ${btoa(`${u}:${p}`)}`;
}

export default function AdminPollsPage() {
  const [list, setList] = useState([]);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [excerpt, setExcerpt] = useState("");
  const [draft, setDraft] = useState(true);
  const [provider, setProvider] = useState("hyvor");
  const [embed, setEmbed] = useState("");   // paste Hyvor Polls embed code here
  const [body, setBody] = useState("");
  const bodyRef = useRef(null);

  async function loadList() {
    const res = await fetch("/api/admin/polls", { headers: { Authorization: basicAuth() } });
    const json = await res.json();
    if (json.ok) setList(json.items);
    else alert("Failed to load list");
  }

  async function loadOne(s) {
    const res = await fetch(`/api/admin/polls/${s}`, { headers: { Authorization: basicAuth() } });
    const json = await res.json();
    if (!json.ok) return alert("Load failed");
    const fm = json.data.frontmatter || {};
    setSlug(s);
    setTitle(fm.title || "");
    setDate(fm.date || new Date().toISOString().slice(0, 10));
    setExcerpt(fm.excerpt || "");
    setDraft(!!fm.draft);
    setProvider(fm.provider || "hyvor");
    setEmbed(fm.embed || "");
    setBody(json.data.content || "");
  }

  async function save() {
    const payload = { title, date, excerpt, draft, provider, embed, content: body, slug };
    const method = slug ? "PUT" : "POST";
    const url = slug ? `/api/admin/polls/${slug}` : "/api/admin/polls";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: basicAuth() },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) return alert("Save failed");
    if (!slug && json.slug) setSlug(json.slug);
    alert("Saved");
    loadList();
  }

  useEffect(() => { loadList(); }, []);

  return (
    <div className="container py-8 grid gap-6">
      <h1 className="text-2xl font-semibold">Admin · Survivor Polls</h1>

      {/* List */}
      <div className="rounded border border-white/15 bg-white/5 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Existing Polls</h2>
          <button className="text-sm underline" onClick={loadList}>Refresh</button>
        </div>
        {list.length === 0 ? (
          <p className="text-white/70">No polls yet.</p>
        ) : (
          <ul className="grid gap-1">
            {list.map((p) => (
              <li key={p.slug} className="flex items-center justify-between">
                <button className="text-left hover:underline" onClick={() => loadOne(p.slug)}>
                  {p.title || p.slug} {p.draft ? <span className="text-yellow-400/80">(draft)</span> : null}
                </button>
                <span className="text-white/50 text-sm">{p.date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Editor */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Title</span>
            <input className="px-3 py-2 rounded bg-white/10 border border-white/20"
                   value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Date</span>
            <input type="date" className="px-3 py-2 rounded bg-white/10 border border-white/20"
                   value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Excerpt</span>
            <input className="px-3 py-2 rounded bg-white/10 border border-white/20"
                   value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
            <span>Draft (hide from public)</span>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Provider</span>
            <select className="px-3 py-2 rounded bg-white/10 border border-white/20"
                    value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="hyvor">Hyvor Polls</option>
              <option value="other">Other (iframe/script)</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Embed HTML (paste from Hyvor Polls “Embed”)</span>
            <textarea className="min-h-[120px] px-3 py-2 rounded bg-white/10 border border-white/20 font-mono"
                      value={embed} onChange={(e) => setEmbed(e.target.value)} />
          </label>
          <button className="px-3 py-2 rounded bg-[color:var(--skol-gold)] text-black font-semibold"
                  onClick={save}>Save</button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Intro Body (optional Markdown above comments)</span>
            <textarea ref={bodyRef}
                      className="min-h-[260px] px-3 py-2 rounded bg-white/10 border border-white/20 font-mono"
                      value={body} onChange={(e) => setBody(e.target.value)}
                      placeholder="Optional intro before the comments…" />
          </label>
          <div className="prose prose-invert max-w-none bg-white/5 border border-white/10 rounded p-4">
            <div className="mb-3 text-xs text-white/60">Live preview</div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
