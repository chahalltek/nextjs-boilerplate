// app/admin/start-sit/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Prefer your public URL if set; otherwise use the current origin. */
function getBase() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
    } catch {}
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/* Tiny Markdown → HTML used in the newsletter; duplicated here client-side */
function mdToHtml(md) {
  if (!md) return "";

  // normalize + escape
  md = String(md).replace(/\r\n/g, "\n");
  md = md.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  // helper: inline replacements (bold, italic, links)
  const applyInline = (s) =>
    s
      // **bold**
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // _italic_  (avoid underscores inside_words_)
      .replace(/(^|[^_])_(.+?)_(?!_)/g, "$1<em>$2</em>")
      // [text](https?://url)
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      );

  // headings
  md = md
    .replace(/^###\s+(.*)$/gm, (_m, t) => `<h3>${applyInline(t)}</h3>`)
    .replace(/^##\s+(.*)$/gm, (_m, t) => `<h2>${applyInline(t)}</h2>`)
    .replace(/^#\s+(.*)$/gm, (_m, t) => `<h1>${applyInline(t)}</h1>`);

  // horizontal rule
  md = md.replace(/^\s*---+\s*$/gm, "<hr />");

  // bullet lists
  md = md.replace(/^(?:-\s+.*(?:\n|$))+?/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((line) => line.replace(/^-+\s+/, "").trim())
      .map((txt) => `<li>${applyInline(txt)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // paragraphs (keep single newlines as <br>)
  md = md
    .split(/\n{2,}/)
    .map((chunk) =>
      /^<(h\d|ul|hr)/i.test(chunk.trim())
        ? chunk
        : `<p>${applyInline(chunk).split("\n").join("<br />")}</p>`
    )
    .join("\n");

  return md;
}

function Toolbar({ apply }) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {[
        ["B", (s) => `**${s || "bold"}**`],
        ["I", (s) => `_${s || "italic"}_`],
        ["H2", (s) => `## ${s || "Heading"}`],
        ["H3", (s) => `### ${s || "Heading"}`],
        ["• List", (s) => (s ? s.split("\n").map((l) => `- ${l}`).join("\n") : "- item\n- item")],
        ["Link", (s) => `[${s || "text"}](https://example.com)`],
        ["HR", () => `\n---\n`],
      ].map(([label, fn]) => (
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
  const [key, setKey] = useState(""); // week key e.g. 2025-wk01
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState(null);
  const editorRef = useRef(null);
  const base = useMemo(getBase, []);

  // Load drafts on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${base}/api/admin/startsit/drafts`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        setDrafts(json?.items || []);
        if (json?.items?.[0]) selectDraft(json.items[0].id);
      } catch (e) {
        console.error(e);
        setStatus("⚠️ Failed to load drafts");
      }
    })();
  }, [base]);

  async function selectDraft(id) {
    try {
      const res = await fetch(`${base}/api/admin/startsit/draft/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const d = await res.json();
      setActive(d.id);
      setKey(d.key || d.week || "");
      setTitle(d.title || "");
      setBody(d.markdown ?? d.body ?? "");
    } catch (e) {
      console.error(e);
      setStatus("⚠️ Failed to load draft");
    }
  }

  async function saveDraft() {
    setStatus("Saving draft…");
    try {
      const res = await fetch(`${base}/api/admin/startsit/drafts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId || undefined, key, title, markdown: body }),
      });
      const json = await res.json();
      setActive(json.id);
      setStatus("✅ Draft saved");
      // refresh list
      const list = await (
        await fetch(`${base}/api/admin/startsit/drafts`, { credentials: "include" })
      ).json();
      setDrafts(list.items || []);
    } catch (e) {
      console.error(e);
      setStatus("❌ Save failed");
    }
  }

  async function deleteDraft(id) {
    if (!id) return;
    if (!confirm("Delete this draft?")) return;
    setStatus("Deleting…");
    try {
      await fetch(`${base}/api/admin/startsit/draft/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setStatus("🗑️ Deleted");
      setActive("");
      setKey("");
      setTitle("");
      setBody("");
      const list = await (
        await fetch(`${base}/api/admin/startsit/drafts`, { credentials: "include" })
      ).json();
      setDrafts(list.items || []);
    } catch (e) {
      console.error(e);
      setStatus("❌ Delete failed");
    }
  }

  async function publishDraft() {
    if (!activeId) {
      setStatus("⚠️ Save the draft first.");
      return;
    }
    setStatus("Publishing…");
    try {
      const res = await fetch(`${base}/api/admin/startsit/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("✅ Published. Revalidate /start-sit to refresh the page.");
    } catch (e) {
      console.error(e);
      setStatus("❌ Publish failed");
    }
  }

  // Simple toolbar apply
  function applyFormat(fn) {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);
    const insert = fn(sel);
    ta.setRangeText(insert, start, end, "end");
    setBody(ta.value);
    ta.focus();
  }

  const preview = useMemo(() => ({ __html: mdToHtml(body) }), [body]);

  return (
    <main className="container max-w-6xl py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Start / Sit — Admin</h1>
        <p className="text-white/70">Editor with live preview, drafts, and one-click publish.</p>
      </header>

      {/* Drafts list + actions */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 hover:bg-white/10"
              onClick={() => {
                setActive("");
                setKey("");
                setTitle("");
                setBody("");
              }}
            >
              New draft
            </button>
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 hover:bg-white/10"
              onClick={saveDraft}
            >
              Save draft
            </button>
            <button
              type="button"
              className="rounded border border-white/20 px-3 py-2 hover:bg-white/10"
              onClick={publishDraft}
              title="Copies this draft to ss:thread:{id} and sets ss:current"
            >
              Publish
            </button>
            {activeId && (
              <button
                type="button"
                className="rounded border border-red-400/50 text-red-300 px-3 py-2 hover:bg-red-400/10"
                onClick={() => deleteDraft(activeId)}
              >
                Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Drafts:</span>
            <select
              className="rounded border border-white/20 bg-transparent px-2 py-1"
              value={activeId}
              onChange={(e) => selectDraft(e.target.value)}
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
            placeholder={`## Kickoff notes\n- Use the toolbar to format quickly\n- Bold, italics, lists, links, rules`}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">Preview</h2>
          <article className="prose prose-invert max-w-none" dangerouslySetInnerHTML={preview} />
        </div>
      </section>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70">{status}</div>
        <Link href="/start-sit" target="_blank" className="underline">
          View /start-sit →
        </Link>
      </div>
    </main>
  );
}
