"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prefer your public URL if set; otherwise use current origin
function getBase() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try { return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin; } catch {}
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

// Tiny MD -> HTML (same as server)
function mdToHtml(md) {
  if (!md) return "";
  md = md.replace(/\r\n/g, "\n");
  md = md.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  md = md
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
  md = md.replace(/^\s*---+\s*$/gm, "<hr />");
  md = md.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
         .replace(/_(.+?)_/g, "<em>$1</em>")
         .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
  md = md.replace(/^(?:-\s+.*(?:\n|$))+?/gm, (block) => {
    const items = block.trim().split(/\n/)
      .map((line) => line.replace(/^-+\s+/, "").trim())
      .map((txt) => `<li>${txt}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });
  md = md
    .split(/\n{2,}/)
    .map((chunk) =>
      /^<(h\d|ul|hr)/i.test(chunk.trim()) ? chunk : `<p>${chunk.split("\n").join("<br />")}</p>`
    )
    .join("\n");
  return md;
}

function Toolbar({ apply }) {
  const buttons = [
    ["B", (s) => `**${s || "bold"}**`],
    ["I", (s) => `_${s || "italic"}_`],
    ["H2", (s) => `## ${s || "Heading"}`],
    ["H3", (s) => `### ${s || "Heading"}`],
    ["• List", (s) => (s ? s.split("\n").map((l) => `- ${l}`).join("\n") : "- item\n- item")],
    ["Link", (s) => `[${s || "text"}](https://example.com)`],
    ["HR", () => `\n---\n`],
  ];
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {buttons.map(([label, fn]) => (
        <button
          key={label}
          type="button"
          onClick={() => apply(fn)}
          className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
          title={label}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function StartSitAdminPage() {
  const [drafts, setDrafts] = useState([]);
  const [activeId, setActive] = useState("");
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");      // message text
  const [busy, setBusy] = useState(false);       // disable while busy
  const editorRef = useRef(null);
  const base = useMemo(getBase, []);
  const preview = useMemo(() => ({ __html: mdToHtml(body) }), [body]);

  // Load drafts on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${base}/api/admin/startsit/drafts`, { credentials: "include", cache: "no-store" });
        const json = await res.json();
        setDrafts(json?.items || []);
        if (json?.items?.[0]) selectDraft(json.items[0].id);
      } catch (e) {
        setStatus("⚠️ Failed to load drafts");
      }
    })();
  }, [base]);

  async function selectDraft(id) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/api/admin/startsit/draft/${id}`, { credentials: "include", cache: "no-store" });
      const d = await res.json();
      setActive(d.id);
      setKey(d.key || d.week || "");
      setTitle(d.title || "");
      setBody(d.markdown ?? d.body ?? "");
      setStatus("Draft loaded");
    } catch {
      setStatus("❌ Failed to load draft");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    setStatus("Saving draft…");
    try {
      const res = await fetch(`${base}/api/admin/startsit/drafts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId || undefined, key, title, markdown: body }),
      });
      const json = await res.json();
      if (!res.ok || !json?.id) throw new Error(json?.error || "save failed");
      setActive(json.id);
      const list = await (await fetch(`${base}/api/admin/startsit/drafts`, { credentials: "include" })).json();
      setDrafts(list.items || []);
      setStatus("✅ Draft saved");
    } catch (e) {
      setStatus("❌ Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft(id) {
    if (!id) return;
    if (!confirm("Delete this draft?")) return;
    setBusy(true);
    setStatus("Deleting…");
    try {
      await fetch(`${base}/api/admin/startsit/draft/${id}`, { method: "DELETE", credentials: "include" });
      const list = await (await fetch(`${base}/api/admin/startsit/drafts`, { credentials: "include" })).json();
      setDrafts(list.items || []);
      setActive(""); setKey(""); setTitle(""); setBody("");
      setStatus("🗑️ Deleted");
    } catch {
      setStatus("❌ Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft() {
    if (!activeId) { setStatus("⚠️ Save the draft first."); return; }
    setBusy(true);
    setStatus("Publishing…");
    try {
      const res = await fetch(`${base}/api/admin/startsit/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("✅ Published. Revalidated /start-sit.");
    } catch {
      setStatus("❌ Publish failed");
    } finally {
      setBusy(false);
    }
  }

  function applyFormat(fn) {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = ta.value.slice(start, end);
    const insert = fn(sel);
    ta.setRangeText(insert, start, end, "end");
    setBody(ta.value);
    ta.focus();
  }

  return (
    <main className="container max-w-6xl py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Start / Sit — Admin</h1>
        <p className="text-white/70">Editor with live preview, drafts, and one-click publish.</p>
      </header>

      {/* Control bar with status */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 hover:bg-white/10 disabled:opacity-50"
              onClick={saveDraft}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save draft"}
            </button>

            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 hover:bg-white/10 disabled:opacity-50"
              onClick={publishDraft}
              disabled={busy || !activeId}
              title={!activeId ? "Save the draft before publishing" : "Publish live and revalidate /start-sit"}
            >
              {busy ? "Publishing…" : "Publish"}
            </button>

            {activeId && (
              <button
                type="button"
                className="rounded border border-red-400/50 text-red-300 px-3 py-2 hover:bg-red-400/10 disabled:opacity-50"
                onClick={() => deleteDraft(activeId)}
                disabled={busy}
              >
                Delete
              </button>
            )}

            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 hover:bg-white/10"
              onClick={() => { setActive(""); setKey(""); setTitle(""); setBody(""); setStatus("Reset to new draft"); }}
              disabled={busy}
              title="Clear fields to a blank draft"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">{status}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Drafts:</span>
              <select
                className="rounded border border-white/20 bg-transparent px-2 py-1"
                value={activeId}
                onChange={(e) => selectDraft(e.target.value)}
                disabled={busy}
              >
                <option value="">— select —</option>
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title || d.key || d.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Editor + Preview */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="grid gap-2">
            <label className="text-sm text-white/80">Key (slug / unique id, e.g. 2025-wk01)</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-white/80">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </div>

          <Toolbar apply={applyFormat} />

          <textarea
            ref={editorRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 font-mono"
            placeholder={`## Kickoff notes\n- Use the toolbar\n\n**Bold player:** note here`}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">Preview</h2>
          <article
            className="prose prose-invert max-w-none
                       prose-p:my-4 prose-p:leading-7
                       prose-ul:my-4 prose-li:my-1 prose-hr:my-6"
            dangerouslySetInnerHTML={preview}
          />
          <div className="mt-4 text-right">
            <Link href="/start-sit" target="_blank" className="underline">
              View /start-sit →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
