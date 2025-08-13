"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// prompt-based Basic Auth (same style you use in /admin)
function authHeader() {
  const u = sessionStorage.getItem("adm_u") || prompt("Admin user:") || "";
  const p = sessionStorage.getItem("adm_p") || prompt("Admin pass:") || "";
  sessionStorage.setItem("adm_u", u);
  sessionStorage.setItem("adm_p", p);
  return { Authorization: `Basic ${btoa(`${u}:${p}`)}` };
}

const slugify = (s = "") =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

const letter = (i) => String.fromCharCode(65 + i); // A,B,C…

export default function AdminPollsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [editingSlug, setEditingSlug] = useState("");
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState(true);
  const [options, setOptions] = useState([{ text: "" }, { text: "" }]); // min 2
  const [intro, setIntro] = useState(""); // optional Markdown above comments
  const introRef = useRef(null);

  const canSave = useMemo(() =>
    title.trim() && question.trim() && options.filter(o => o.text.trim()).length >= 2,
  [title, question, options]);

  useEffect(() => { refreshList(); }, []);

  async function refreshList() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/polls", { headers: authHeader() });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error("load failed");
      setList(j.items || []);
    } catch (e) {
      alert("Failed to load polls");
    } finally {
      setLoading(false);
    }
  }

  async function loadOne(slug) {
    try {
      const res = await fetch(`/api/admin/polls/${slug}`, { headers: authHeader() });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error("load failed");
      const p = j.item || j.data || {};
      setEditingSlug(p.slug || slug);
      setTitle(p.title || "");
      setQuestion(p.question || "");
      setDraft(!!p.draft);
      const opts = (p.options || []).map(o => ({ text: o.text || o.label || "" }));
      setOptions(opts.length >= 2 ? opts : [{ text: "" }, { text: "" }]);
      setIntro(p.intro || p.body || "");
    } catch {
      alert("Failed to load poll");
    }
  }

  async function save() {
    const slug = editingSlug || slugify(title);
    const payload = {
      slug,
      title,
      question,
      draft,
      intro,
      options: options
        .map((o, i) => ({ id: letter(i).toLowerCase(), text: o.text.trim() }))
        .filter(o => o.text),
    };
    const method = editingSlug ? "PUT" : "POST";
    const url = editingSlug ? `/api/admin/polls/${editingSlug}` : "/api/admin/polls";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert("Save failed");
    setEditingSlug(slug);
    alert("Saved");
    refreshList();
  }

  async function remove(slug) {
    if (!confirm(`Delete poll “${slug}”?`)) return;
    const res = await fetch(`/api/admin/polls/${slug}`, { method: "DELETE", headers: authHeader() });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert("Delete failed");
    if (editingSlug === slug) resetForm();
    refreshList();
  }

  function resetForm() {
    setEditingSlug("");
    setTitle("");
    setQuestion("");
    setDraft(true);
    setOptions([{ text: "" }, { text: "" }]);
    setIntro("");
  }

  function addOption() { setOptions(prev => [...prev, { text: "" }]); }
  function removeOptionAt(i) {
    setOptions(prev => prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i));
  }

  function insertAtC
