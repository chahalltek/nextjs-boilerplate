"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsletterSourceKey } from "@/lib/newsletter/store";

/** ---------- Types passed from the server component ---------- */
type DraftListItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  scheduledAt: string | null;
  audienceTag?: string;
};

type SendTestResult = { ok: boolean; message: string };

/** Render a lightweight preview (headings, paragraphs, UL/OL, hr, links). */
function renderPreview(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  const pushPara = (text: string) => {
    if (!text.trim()) {
      out.push("<br/>");
      return;
    }
    out.push(`<p class="opacity-80">${text}</p>`);
  };

  while (i < lines.length) {
    const l = lines[i];

    if (l.startsWith("### ")) {
      out.push(`<h3 class="font-semibold mt-3 mb-1">${l.slice(4)}</h3>`);
      i++;
      continue;
    }
    if (l.startsWith("## ")) {
      out.push(`<h2 class="text-lg font-semibold mt-4 mb-2">${l.slice(3)}</h2>`);
      i++;
      continue;
    }
    if (l.startsWith("# ")) {
      out.push(`<h1 class="text-xl font-semibold mb-2">${l.slice(2)}</h1>`);
      i++;
      continue;
    }
    if (/^---+$/.test(l.trim())) {
      out.push('<hr class="border-white/10 my-4" />');
      i++;
      continue;
    }

    // Unordered list (collect contiguous “- ” lines)
    if (/^\s*-\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(`<li>${lines[i].replace(/^\s*-\s+/, "")}</li>`);
        i++;
      }
      out.push(`<ul class="list-disc ml-5 space-y-1">${items.join("")}</ul>`);
      continue;
    }

    // Ordered list (collect contiguous “1. ” style lines)
    if (/^\s*\d+\.\s+/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${lines[i].replace(/^\s*\d+\.\s+/, "")}</li>`);
        i++;
      }
      out.push(`<ol class="list-decimal ml-5 space-y-1">${items.join("")}</ol>`);
      continue;
    }

    // Blank line -> visible paragraph break
    if (!l.trim()) {
      out.push("<br/>");
      i++;
      continue;
    }

    pushPara(l);
    i++;
  }

  return out.join("\n");
}

export default function ClientUI(props: {
  existing: {
    id: string;
    title: string;
    subject: string;
    markdown: string;
    audienceTag?: string;
  };
  drafts: DraftListItem[];
  allSources: { key: NewsletterSourceKey; label: string }[];
  neverVerbatim: NewsletterSourceKey[];
  // server actions
  actionCompile: (fd: FormData) => Promise<void>;
  actionSave: (fd: FormData) => Promise<void>;
  actionSchedule: (fd: FormData) => Promise<void>;
  actionSendNow: (fd: FormData) => Promise<void>;
  actionSendTest: (fd: FormData) => Promise<SendTestResult>;
  actionDelete: (fd: FormData) => Promise<void>;
}) {
  const {
    existing,
    drafts,
    allSources,
    neverVerbatim,
    actionCompile,
    actionSave,
    actionSchedule,
    actionSendNow,
    actionSendTest,
    actionDelete,
  } = props;

  /** ---------- Editor state ---------- */
  const [title, setTitle] = useState(existing.title || "Weekly Newsletter");
  const [subject, setSubject] = useState(existing.subject || "");
  const [markdown, setMarkdown] = useState(existing.markdown || "");
  const [audienceTag, setAudienceTag] = useState(existing.audienceTag || "");
  const [testTo, setTestTo] = useState(""); // comma/space separated emails
  const [testResult, setTestResult] = useState<SendTestResult | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  // When a new/other draft is loaded (?id=...), sync inputs
  useEffect(() => {
    setTitle(existing.title || "Weekly Newsletter");
    setSubject(existing.subject || "");
    setMarkdown(existing.markdown || "");
    setAudienceTag(existing.audienceTag || "");
    setTestResult(null);
  }, [existing.id]);

  const previewHtml = useMemo(() => renderPreview(markdown || ""), [markdown]);

  /** ---------- Simple Markdown toolbar ---------- */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  function insert(before: string, after = "", placeholder = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart ?? 0;
    const e = ta.selectionEnd ?? 0;
    const sel = ta.value.slice(s, e) || placeholder;
    const next = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    setMarkdown(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = s + before.length + sel.length + after.length;
      ta.selectionStart = ta.selectionEnd = pos;
    });
  }
  const toolbarBtn =
    "rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 bg-black/20";

  /** ---------- Test send handler (client wraps server action) ---------- */
  async function onSendTest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", existing.id || "");
    fd.set("subject", subject);
    fd.set("markdown", markdown);
    fd.set("to", testTo);
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await actionSendTest(fd);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || "Failed to send test" });
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <main className="container max-w-6xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Newsletter</h1>
        <p className="text-white/70">Pick sources, compile with AI, edit, test, schedule, send.</p>
      </header>

      {/* 1) Choose content */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">1) Choose content</h2>

        <form action={actionCompile} className="grid gap-3">
          {/* Quick ranges */}
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
              <input type="date" name="dateFrom" className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
              <input type="date" name="dateTo" className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            </div>
          </fieldset>

          {/* Sources */}
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
                    <input name={`from:${s.key}`} type="date" className="rounded border border-white/15 bg-transparent px-2 py-1" />
                    <input name={`to:${s.key}`} type="date" className="rounded border border-white/15 bg-transparent px-2 py-1" />
                    <input name={`limit:${s.key}`} type="number" min={1} max={20} placeholder="Top N" className="rounded border border-white/15 bg-transparent px-2 py-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Style + audience */}
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

          <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 w-fit">
            Compile with AI
          </button>
        </form>
      </section>

      {/* 2) Edit draft */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">2) Edit draft</h2>
        <form action={actionSave} className="grid gap-3">
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

          {/* Sticky formatting toolbar */}
          <div className="sticky top-2 z-10 bg-black/30 backdrop-blur rounded-md p-2 flex flex-wrap gap-2 text-xs border border-white/10">
            <button type="button" className={toolbarBtn} onClick={() => insert("**", "**", "bold")}>Bold</button>
            <button type="button" className={toolbarBtn} onClick={() => insert("_", "_", "em")}>Italics</button>
            <button type="button" className={toolbarBtn} onClick={() => insert("<u>", "</u>", "underline")}>Underline</button>
            <button type="button" className={toolbarBtn} onClick={() => insert("## ", "", "Heading")}>H2</button>
            <button type="button" className={toolbarBtn} onClick={() => insert("- ", "", "item ")}>List</button>
            <button type="button" className={toolbarBtn} onClick={() => insert("[", "](https://)", "link text")}>Link</button>
            <button type="button" className={toolbarBtn} onClick={() => insert("\n\n", "", "")}>¶ Break</button>
            <button type="button" className={toolbarBtn} onClick={() => insert("\n\n---\n\n", "", "")}>HR</button>
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
            </label>
            <div className="rounded-lg border border-white/10 p-3 bg-black/20 overflow-auto">
              <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Preview</div>
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
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
  <h2 className="text-lg font-semibold">Send a test</h2>

  <form action={props.actionSendTest} className="flex flex-wrap items-end gap-2">
    {/* use current editor values */}
    <input type="hidden" name="id" value={existing.id} />
    <input type="hidden" name="subject" value={subject} />
    <input type="hidden" name="markdown" value={markdown} />
    <input type="hidden" name="audienceTag" value={audienceTag} />

    <label className="grid gap-1 text-sm min-w-[260px] flex-1">
      <span className="text-white/80">Recipient(s)</span>
      <input
        name="testRecipients"
        placeholder="you@example.com, other@site.com"
        className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
      />
    </label>

    <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
      Send test
    </button>
  </form>

  <p className="text-xs text-white/50">
    Only the addresses entered above will receive this test email.
  </p>
</section>

      {/* 3) Schedule / Send */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">3) Schedule or send</h2>
        <div className="flex flex-wrap items-end gap-3">
          <form action={actionSchedule} className="flex items-end gap-2">
            <input type="hidden" name="id" value={existing.id} />
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Send at (local)</span>
              <input type="datetime-local" name="scheduleAt" className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            </label>
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Schedule</button>
          </form>

          <form action={actionSendNow}>
            <input type="hidden" name="id" value={existing.id} />
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Send now</button>
          </form>
        </div>
      </section>

      {/* Newsletters list */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Newsletters</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-white/60">No newsletters yet. Use “Compile with AI”.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{d.title || "Untitled"}</div>
                  <div className="text-white/50">
                    {d.status}
                    {d.scheduledAt ? ` • scheduled ${new Date(d.scheduledAt).toLocaleString()}` : ""}
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
                  <form action={actionDelete}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="rounded border border-red-400/30 text-red-200 px-2 py-1 text-xs hover:bg-red-400/10">
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
