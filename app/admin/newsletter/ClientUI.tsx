// app/admin/newsletter/ClientUI.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { NewsletterSourceKey } from "@/lib/newsletter/store";

import ReactMarkdown from "react-markdown";
// Import with aliases to avoid vfile typing clashes & name shadowing
import remarkGfmOrig from "remark-gfm";
import remarkBreaksOrig from "remark-breaks";
import rehypeRawOrig from "rehype-raw";
import type { PluggableList } from "unified";

// Safe casts so we don’t trip on mismatched vfile versions in CI
const remarkGfm: any = remarkGfmOrig as any;
const remarkBreaks: any = remarkBreaksOrig as any;
const rehypeRaw: any = rehypeRawOrig as any;
const REMARKS: PluggableList = [remarkGfm, remarkBreaks];
const REHYPES: PluggableList = [rehypeRaw];

/* ---------- types ---------- */
type DraftListItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  scheduledAt: string | null;
  audienceTag?: string;
};

/* ---------- component ---------- */
export default function ClientUI(props: {
  existing: {
    id: string;
    title: string;
    subject: string;
    markdown: string;
    audienceTag?: string;
    previewHtml: string; // kept for backward compatibility (not used now)
  };
  drafts: DraftListItem[];
  allSources: { key: NewsletterSourceKey; label: string }[];
  neverVerbatim: NewsletterSourceKey[];
  actionCompile: (fd: FormData) => Promise<void>;
  actionSave: (fd: FormData) => Promise<void>;
  actionSchedule: (fd: FormData) => Promise<void>;
  actionSendNow: (fd: FormData) => Promise<void>;
  actionSendTest: (fd: FormData) => Promise<void>;
  actionDelete: (fd: FormData) => Promise<void>;
}) {
  const {
    existing,
    drafts: draftsFromServer,
    allSources,
    neverVerbatim,
    actionCompile,
    actionSave,
    actionSchedule,
    actionSendNow,
    actionDelete,
    actionSendTest,
  } = props;

  /* ---------- editor state ---------- */
  const [title, setTitle] = useState(existing.title);
  const [subject, setSubject] = useState(
    existing.subject || "Your weekly Hey Skol Sister rundown!"
  );
  const [markdown, setMarkdown] = useState(existing.markdown);
  const [audienceTag, setAudienceTag] = useState(existing.audienceTag || "");

  // local copy so we can optimistically update deletes
  const [drafts, setDrafts] = useState<DraftListItem[]>(draftsFromServer);
  useEffect(() => setDrafts(draftsFromServer), [draftsFromServer]);

  /* ---------- inline confirmations ---------- */
  const [compileNote, setCompileNote] = useState<string>("");
  const [saveNote, setSaveNote] = useState<string>("");
  const [sendTestNote, setSendTestNote] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  /* ---------- sync when a different draft loads ---------- */
  useEffect(() => {
    setTitle(existing.title);
    setSubject(existing.subject || "Your weekly Hey Skol Sister rundown!");
    setMarkdown(existing.markdown);
    setAudienceTag(existing.audienceTag || "");
    setSaveNote("");
    setCompileNote("");
    setSendTestNote("");
  }, [existing.id, existing.title, existing.subject, existing.markdown, existing.audienceTag]);

  /* ---------- markdown toolbar ---------- */
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insert(before: string, after = "", placeholder = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s = 0, selectionEnd: e = 0 } = ta;
    const sel = ta.value.slice(s, e) || placeholder;
    const next = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    setMarkdown(next);
    const newPos = s + before.length + sel.length + after.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = newPos;
    });
  }

  const toolbarBtn =
    "rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 bg-black/20";

  /* ---------- PREVIEW (ReactMarkdown) ---------- */
  const previewMd = useMemo(() => {
    // normalize CRLF and NBSP; this helps consistent breaks
    return (markdown || "")
      .replace(/\u00A0/g, " ")
      .replace(/\r\n/g, "\n");
  }, [markdown]);

  /* ---------- send test (client handler -> server action) ---------- */
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  async function onSendTest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSendTestNote("");
    setSendingTest(true);
    try {
      const fd = new FormData();
      // match server action field name exactly
      fd.set("id", existing.id);
      fd.set("subject", subject);
      fd.set("markdown", markdown);
      fd.set("testRecipients", testTo); // <-- FIXED: was "to"

      await actionSendTest(fd);
      setSendTestNote("✅ Test email submitted. Check your inbox.");
    } catch (err: any) {
      setSendTestNote(`❌ Test failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSendingTest(false);
    }
  }

  /* ---------- UI ---------- */
  return (
    <main className="container max-w-6xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Newsletter</h1>
        <p className="text-white/70">Pick sources, compile with AI, edit, schedule, send.</p>
      </header>

      {/* 1) Choose content */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">1) Choose content</h2>
          {compileNote && (
            <span className="text-sm text-emerald-300">{compileNote}</span>
          )}
        </div>

        <form
          action={actionCompile}
          className="grid gap-3"
          onSubmit={() => setCompileNote("Compiling… (this page will refresh)")}
        >
          {/* ranges */}
          <fieldset className="grid gap-2">
            <span className="text-sm text-white/80">Quick range</span>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                ["last7", "Last 7 days"],
                ["last14", "Last 14 days"],
                ["last30", "Last 30 days"],
                ["season", "This season"],
                ["custom", "Custom"],
              ].map(([v, label]) => (
                <label key={v} className="inline-flex items-center gap-2">
                  <input type="radio" name="preset" value={v} defaultChecked={v === "last14"} />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="date"
                name="dateFrom"
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
              <input
                type="date"
                name="dateTo"
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </div>
          </fieldset>

          {/* sources */}
          <div className="grid sm:grid-cols-2 gap-3">
            {allSources.map((s) => {
              const showVerbatim = !neverVerbatim.includes(s.key);
              return (
                <div key={s.key} className="rounded-lg border border-white/10 p-3">
                  <label className="flex items-center gap-3">
                    <input name={`include:${s.key}`} type="checkbox" className="scale-110" />
                    <div className="flex-1">
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-white/60">Include this section</div>
                    </div>
                    {showVerbatim && (
                      <label className="flex items-center gap-2 text-xs">
                        <input name={`verbatim:${s.key}`} type="checkbox" /> verbatim
                      </label>
                    )}
                  </label>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <input
                      name={`from:${s.key}`}
                      type="date"
                      className="rounded border border-white/15 bg-transparent px-2 py-1"
                    />
                    <input
                      name={`to:${s.key}`}
                      type="date"
                      className="rounded border border-white/15 bg-transparent px-2 py-1"
                    />
                    <input
                      name={`limit:${s.key}`}
                      type="number"
                      min={1}
                      max={20}
                      placeholder="Top N"
                      className="rounded border border-white/15 bg-transparent px-2 py-1"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* style + audience */}
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Style / AI prompt</span>
            <textarea
              name="stylePrompt"
              rows={3}
              defaultValue="Funny, witty, newsletter-length (~600–900 words). Use clear headings. Keep VERBATIM unchanged."
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Audience tag (optional)</span>
            <input
              name="audienceTag"
              placeholder="e.g. survivor-weekly"
              value={audienceTag}
              onChange={(e) => setAudienceTag(e.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 w-fit"
          >
            Compile with AI
          </button>
        </form>
      </section>

      {/* 2) Edit draft */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">2) Edit draft</h2>
          {saveNote && <span className="text-sm text-emerald-300">{saveNote}</span>}
        </div>

        <form
          action={actionSave}
          className="grid gap-3"
          onSubmit={() => setSaveNote("Saving…")}
        >
          <input type="hidden" name="id" value={existing.id} />

          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Internal title</span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Subject</span>
            <input
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>

          {/* sticky toolbar */}
          <div className="sticky top-16 z-10 bg-[#0f0d18]/80 backdrop-blur rounded-lg p-2 flex flex-wrap gap-2 text-xs border border-white/10">
            <button type="button" className={toolbarBtn} onClick={() => insert("**", "**", "bold")}>
              Bold
            </button>
            <button type="button" className={toolbarBtn} onClick={() => insert("_", "_", "italics")}>
              Italics
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => insert("<u>", "</u>", "underline")}
            >
              Underline
            </button>
            <button type="button" className={toolbarBtn} onClick={() => insert("## ", "")}>
              H2
            </button>
            <button type="button" className={toolbarBtn} onClick={() => insert("- ", "", "item")}>
              List
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => insert("[", "](https://)", "link")}
            >
              Link
            </button>
            <button
              type="button"
              title="Soft line break"
              className={toolbarBtn}
              onClick={() => insert("<br />\n", "")} // <-- explicit break, works in preview & email
            >
              ¶ Break
            </button>
            <button
              type="button"
              title="New paragraph"
              className={toolbarBtn}
              onClick={() => insert("\n\n", "")}
            >
              Para
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => insert("\n\n---\n\n", "")}
            >
              HR
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Body (Markdown)</span>
              <textarea
                ref={textareaRef}
                name="markdown"
                rows={18}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2 font-mono text-xs"
              />
              <p className="text-[11px] text-white/50 mt-1">
                Tips: a blank line creates a paragraph. Use <code>¶ Break</code> for a line break
                inside a paragraph, or <code>HR</code> for a divider.
              </p>
            </label>

            <div className="rounded-lg border border-white/10 p-3 bg-black/20">
              <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Preview</div>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
  remarkPlugins={REMARKS as any}
  rehypePlugins={REHYPES as any}
  components={{
    a: (props: any) => (
      <a {...props} target="_blank" rel="noopener noreferrer" />
    ),
  }}
>
  {previewMd}
</ReactMarkdown>

              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Audience tag (optional)</span>
              <input
                name="audienceTag"
                value={audienceTag}
                onChange={(e) => setAudienceTag(e.target.value)}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </label>
            <button className="self-end rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
              Save Draft
            </button>
          </div>
        </form>
      </section>

      {/* 2.5) Send a test */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send a test</h2>
          {sendTestNote && (
            <span className="text-sm {sendTestNote.startsWith('✅') ? 'text-emerald-300' : 'text-red-300'}">
              {sendTestNote}
            </span>
          )}
        </div>

        <form onSubmit={onSendTest} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm min-w-[260px] flex-1">
            <span className="text-white/80">Recipient(s)</span>
            <input
              name="testRecipients" // name for UX only; we still manually build the FormData
              placeholder="you@example.com, other@site.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>
          <button
            disabled={sendingTest}
            className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 disabled:opacity-60"
          >
            {sendingTest ? "Sending…" : "Send test"}
          </button>
        </form>
      </section>

      {/* 3) Schedule / Send */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">3) Schedule or send</h2>
        <div className="flex flex-wrap items-end gap-3">
          <form action={actionSchedule} className="flex items-end gap-2">
            <input type="hidden" name="id" value={existing.id} />
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Send at (local)</span>
              <input
                type="datetime-local"
                name="scheduleAt"
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </label>
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
              Schedule
            </button>
          </form>

          <form action={actionSendNow}>
            <input type="hidden" name="id" value={existing.id} />
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
              Send now
            </button>
          </form>
        </div>
      </section>

      {/* Newsletters */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Newsletters</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-white/60">No newsletters yet. Use “Compile with AI”.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
              >
                <div className="text-sm">
                  <div className="font-medium">{d.title || "Untitled"}</div>
                  <div className="text-white/50">
                    {d.status}
                    {d.scheduledAt
                      ? ` • scheduled ${new Date(d.scheduledAt).toLocaleString()}`
                      : ""}
                    {d.updatedAt ? ` • updated ${new Date(d.updatedAt).toLocaleString()}` : ""}
                    {d.audienceTag ? ` • audience: ${d.audienceTag}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/admin/newsletter?id=${encodeURIComponent(d.id)}`}
                    className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                  >
                    Edit
                  </a>

                  {/* Optimistic delete: remove from list immediately, then submit form */}
                  <form
                    action={actionDelete}
                    onSubmit={(e) => {
                      // nothing here; we trigger submit programmatically below
                    }}
                  >
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="button"
                      onClick={(ev) => {
                        const ok = confirm("Delete this draft?");
                        if (!ok) return;
                        // Optimistically remove from local list
                        setDrafts((prev) => prev.filter((x) => x.id !== d.id));
                        // Submit the form to actually delete on server
                        (ev.currentTarget.parentElement as HTMLFormElement).requestSubmit();
                      }}
                      className="rounded border border-red-400/30 text-red-200 px-2 py-1 text-xs hover:bg-red-400/10"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
