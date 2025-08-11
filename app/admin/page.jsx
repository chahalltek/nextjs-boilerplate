"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function authHeader() {
  const u = prompt("Admin user:") || "";
  const p = prompt("Admin pass:") || "";
  return { Authorization: `Basic ${btoa(`${u}:${p}`)}` };
}

export default function AdminPage() {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState([]);
  const [draft, setDraft] = useState(true);
  const [body, setBody] = useState("");
  const [list, setList] = useState([]);
  const textareaRef = useRef(null);

  function insertAtCursor(snippet) {
    const el = textareaRef.current;
    if (!el) { setBody((b) => b + snippet); return; }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + snippet.length;
      el.focus();
    });
  }

  async function loadList() {
    const res = await fetch("/api/admin/posts", { headers: authHeader() });
    const j = await res.json();
    if (j.ok) setList(j.items || []);
  }

  async function load(slugToLoad) {
    const res = await fetch(`/api/admin/posts/${slugToLoad}`, { headers: authHeader() });
    const j = await res.json();
    if (!j.ok) return alert("Load failed");
    setSlug(slugToLoad);
    setTitle(j.title || "");
    setDate(j.date ? j.date.slice(0,10) : new Date().toISOString().slice(0,10));
    setExcerpt(j.excerpt || "");
    setDraft(j.draft === true);
    setBody(j.content || "");
    setTags(j.tags || []);
  }

  async function save() {
    const payload = { title, date, excerpt, tags, draft, content: body, slug };
    const method = slug ? "PUT" : "POST";
    const url = slug ? `/api/admin/posts/${slug}` : "/api/admin/posts";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert("Save failed");
    if (!slug && j.slug) setSlug(j.slug);
    alert("Saved");
    loadList();
  }

  async function del() {
    if (!slug) return alert("Nothing loaded");
    if (!confirm(`Delete ${slug}.md?`)) return;
    const res = await fetch(`/api/admin/posts/${slug}`, { method: "DELETE", headers: authHeader() });
    const j = await res.json();
    if (!j.ok) return alert("Delete failed");
    setSlug(""); setTitle(""); setExcerpt(""); setBody(""); setTags([]); setDraft(true);
    loadList();
  }

  async function handleUpload(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("slug", slug || title || file.name);
    const res = await fetch("/api/admin/uploads", { method: "POST", body: fd, headers: authHeader() });
    const json = await res.json();
    if (json.ok && json.url) {
      const alt = prompt("Alt text (optional)") || "";
      insertAtCursor(`\n![${alt}](${json.url})\n`);
    } else {
      alert("Upload failed: " + (json.error || res.status));
    }
  }

  useEffect(() => { loadList(); }, []);

  return (
    <div className="container py-8 grid gap-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="bg-white/5 border border-white/10 rounded p-4">
        <h2 className="font-semibold mb-2">Posts</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {list.map((p) => (
            <button key={p.slug} className="px-2 py-1 rounded border border-white/20 hover:bg-white/10" onClick={() => load(p.slug)}>
              {p.draft ? "📝 " : ""}{p.slug}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm">Title</span>
          <input className="px-3 py-2 rounded bg-white/10 border border-white/20" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Date</span>
          <input type="date" className="px-3 py-2 rounded bg-white/10 border border-white/20" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm">Excerpt</span>
          <input className="px-3 py-2 rounded bg-white/10 border border-white/20" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
          <span>Draft (hide from public)</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <label className="px-3 py-2 border border-white/20 rounded cursor-pointer">
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          Upload image…
        </label>
        <button className="px-3 py-2 rounded bg-[color:var(--skol-gold)] text-black font-semibold" onClick={save}>Save</button>
        <button className="px-3 py-2 rounded border border-red-500/50 text-red-300 hover:bg-red-500/10" onClick={del}>Delete</button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <textarea ref={textareaRef} className="min-h-[60vh] px-3 py-2 rounded bg-white/10 border border-white/20 font-mono" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write Markdown here…" />
        <div className="prose prose-invert max-w-none bg-white/5 border border-white/10 rounded p-4">
          <div className="mb-3 flex items-center gap-2">
            {draft && <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40">Draft</span>}
            <span className="text-xs text-white/60">Live preview</span>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}