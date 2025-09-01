// app/admin/newsletter/ClientUI.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type { NewsletterSourceKey } from "@/lib/newsletter/store";

type DraftListItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  audienceTag?: string;
};

type CompileResult = { subject: string; markdown: string };

export default function ClientUI(props: {
  ALL_SOURCES: { key: NewsletterSourceKey; label: string }[];
  NEVER_VERBATIM: NewsletterSourceKey[];
  existing: { id: string; title: string; subject: string; markdown: string; audienceTag?: string };
  drafts: DraftListItem[];
  actions: {
    compileState: (prev: CompileResult | null, formData: FormData) => Promise<CompileResult>;
    save: (formData: FormData) => Promise<void>;
    schedule: (formData: FormData) => Promise<void>;
    sendNow: (formData: FormData) => Promise<void>;
    remove: (formData: FormData) => Promise<void>;
  };
}) {
  const { ALL_SOURCES, NEVER_VERBATIM, existing, drafts, actions } = props;

  // --- Editor state (controlled) ---
  const [title, setTitle] = useState(existing.title);
  const [subject, setSubject] = useState(existing.subject);
  const [markdown, setMarkdown] = useState(existing.markdown);
  const [audienceTag, setAudienceTag] = useState(existing.audienceTag || "");

  // Compile with AI -> update editor only (no save)
  const [compileState, compileAction] = useFormState<CompileResult, FormData>(
    actions.compileState,
    { subject: "", markdown: "" }
  );
  useEffect(() => {
    if (compileState?.markdown) {
      setMarkdown(compileState.markdown);
      if (compileState.subject) setSubject(compileState.subject);
    }
  }, [compileState]);

  // Lightweight preview
  const previewHtml = useMemo(() => {
    return (markdown || "")
      .split("\n")
      .map((l) => {
        if (l.startsWith("# ")) return `<h1 class="text-xl font-semibold mb-2">${l.slice(2)}</h1>`;
        if (l.startsWith("## ")) return `<h2 class="text-lg font-semibold mt-4 mb-2">${l.slice(3)}</h2>`;
        if (l.startsWith("### ")) return `<h3 class="font-semibold mt-3 mb-1">${l.slice(4)}</h3>`;
        if (l.startsWith("- ")) return `<li>${l.slice(2)}</li>`;
        if (!l.trim()) return "";
        return `<p class="opacity-80">${l}</p>`;
      })
      .join("\n")
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="list-disc ml-5 space-y-1">$1</ul>');
  }, [markdown]);

  return (
    <main className="container max-w-6xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Newsletter</h1>
        <p className="text-white/70">Pick sources, compile with AI, edit, schedule, send.</p>
      </header>

      {/* 1) Choose content */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">1) Choose content</h2>

        {/* Compile form (does not persist) */}
        <form action={compileAction} className="grid gap-3">
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
            {ALL_SOURCES.map((s) => {
              const showVerbatim = !NEVER_VERBATIM.includes(s.key);
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

          {/* Style + audience (audience used later when sending/saving) */}
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Style / AI prompt</span>
            <textarea
              name="stylePrompt"
              rows={3}
              defaultValue="Funny, witty, newsletter-length (~600–900 words). Use clear headings. Keep VERBATIM unchanged."
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
        <form action={actions.save} className="grid gap-3">
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

          <div className="grid md:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Body (Markdown)</span>
              <textarea
                name="markdown"
                rows={18}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2 font-mono text-xs"
              />
            </label>
            <div className="rounded-lg border border-white/10 p-3 bg-black/20">
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
            <button className="self-end rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Save Draft</button>
          </div>
        </form>
      </section>

      {/* 3) Schedule / send */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">3) Schedule or send</h2>
        <div className="flex flex-wrap items-end gap-3">
          <form action={actions.schedule} className="flex items-end gap-2">
            <input type="hidden" name="id" value={existing.id} />
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Send at (local)</span>
              <input type="datetime-local" name="scheduleAt" className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            </label>
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Schedule</button>
          </form>

          <form action={actions.sendNow}>
            <input type="hidden" name="id" value={existing.id} />
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Send now</button>
          </form>

          {/* Danger: delete current draft */}
          <form action={actions.remove} className="ml-auto">
            <input type="hidden" name="id" value={existing.id} />
            <button className="rounded-lg border border-red-400/30 text-red-200 px-3 py-2 hover:bg-red-400/10">
              Delete draft
            </button>
          </form>
        </div>
      </section>

      {/* Drafts */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-white/60">No drafts yet. Compile above to create one and then save.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{d.title}</div>
                  <div className="text-white/50">
                    {d.status}
                    {d.scheduledAt ? ` • scheduled ${new Date(d.scheduledAt).toLocaleString()}` : ""}
                    {` • updated ${new Date(d.updatedAt).toLocaleString()}`}
                    {` • created ${new Date(d.createdAt).toLocaleString()}`}
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
                  <form action={actions.remove}>
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
