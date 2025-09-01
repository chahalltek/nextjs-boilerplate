// app/admin/newsletter/page.tsx
import { redirect } from "next/navigation";
import { compileNewsletter } from "@/lib/newsletter/compile";
import {
  listDrafts,
  getDraft,
  saveDraft,
  deleteDraft,
  markStatus,
  type NewsletterDraft,
  type NewsletterSourceKey,
  type SourcePick,
} from "@/lib/newsletter/store";
import { sendNewsletter } from "@/lib/newsletter/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genId = () => Math.random().toString(36).slice(2, 10);

const ALL_SOURCES: { key: NewsletterSourceKey; label: string }[] = [
  { key: "blog", label: "Blog" },
  { key: "weeklyRecap", label: "Weekly Recap" },
  { key: "holdem", label: "Hold’em / Fold’em" },
  { key: "sitStart", label: "Start / Sit" },
  { key: "survivorPolls", label: "Survivor Polls" },
  { key: "survivorLeaderboard", label: "Survivor Leaderboard" },
];
const NEVER_VERBATIM: NewsletterSourceKey[] = ["survivorPolls", "survivorLeaderboard"];

function computeRange(preset?: string, dateFrom?: string, dateTo?: string) {
  if (dateFrom || dateTo) return { dateFrom, dateTo };
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };
  if (preset === "last7") return { dateFrom: toISO(daysAgo(7)), dateTo: toISO(now) };
  if (preset === "last14") return { dateFrom: toISO(daysAgo(14)), dateTo: toISO(now) };
  if (preset === "last30") return { dateFrom: toISO(daysAgo(30)), dateTo: toISO(now) };
  if (preset === "season") {
    const seasonStart = new Date(now.getFullYear(), 7, 1); // Aug 1
    return { dateFrom: toISO(seasonStart), dateTo: toISO(now) };
  }
  return { dateFrom: undefined, dateTo: undefined };
}

/* ---------------- Server Actions ---------------- */

async function actionSave(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || genId());
  const base =
    (await getDraft(id)) ??
    ({ id, createdAt: "", updatedAt: "", subject: "", markdown: "", picks: [], status: "draft" } as NewsletterDraft);

  await saveDraft({
    ...base,
    title: String(formData.get("title") || "Weekly Newsletter"),
    subject: String(formData.get("subject") || ""),
    markdown: String(formData.get("markdown") || ""),
    audienceTag: String(formData.get("audienceTag") || "").trim() || undefined,
  });
  redirect(`/admin/newsletter?id=${encodeURIComponent(id)}`);
}

async function actionSchedule(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const when = String(formData.get("scheduleAt") || "");
  const d = await getDraft(id);
  if (!d) return;
  await saveDraft({ ...d, scheduledAt: when || null, status: when ? "scheduled" : "draft" });
  redirect(`/admin/newsletter?id=${encodeURIComponent(id)}`);
}

async function actionSendNow(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const d = await getDraft(id);
  if (!d) return;
  await sendNewsletter(d);
  await markStatus(id, "sent");
  redirect(`/admin/newsletter`);
}

async function actionDelete(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  await deleteDraft(id);
  redirect(`/admin/newsletter`);
}

/** Server action that compiles BUT DOES NOT SAVE. Returns subject + markdown. */
async function actionCompile(
  _prevState: { subject?: string; markdown?: string } | undefined,
  formData: FormData
) {
  "use server";
  const picks: SourcePick[] = ALL_SOURCES
    .filter((s) => formData.get(`include:${s.key}`) === "on")
    .map((s) => ({
      key: s.key,
      verbatim: !NEVER_VERBATIM.includes(s.key) && formData.get(`verbatim:${s.key}`) === "on",
    }));

  const perSource: Record<NewsletterSourceKey, { dateFrom?: string; dateTo?: string; limit?: number }> = {} as any;
  for (const s of ALL_SOURCES) {
    const from = String(formData.get(`from:${s.key}`) || "") || undefined;
    const to = String(formData.get(`to:${s.key}`) || "") || undefined;
    const limS = String(formData.get(`limit:${s.key}`) || "");
    const limit = limS ? Math.max(1, Math.min(20, parseInt(limS, 10) || 0)) : undefined;
    if (from || to || limit) perSource[s.key] = { dateFrom: from, dateTo: to, limit };
  }

  const preset = String(formData.get("preset") || "") || undefined;
  const globalDateFrom = String(formData.get("dateFrom") || "") || undefined;
  const globalDateTo = String(formData.get("dateTo") || "") || undefined;
  const { dateFrom, dateTo } = computeRange(preset, globalDateFrom, globalDateTo);

  try {
    const { subject, markdown } = await compileNewsletter(picks, {
      dateFrom,
      dateTo,
      stylePrompt: String(formData.get("stylePrompt") || "") || undefined,
      perSource,
    });
    return { subject, markdown };
  } catch (e: any) {
    // Never blow up the page — surface a safe message into the editor.
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "Compile error. Check OpenAI key or content folders.";
    return {
      subject: "Newsletter compile failed",
      markdown:
        `# Newsletter compile failed\n\n> ${msg}\n\n` +
        "_Try different dates or remove AI and use verbatim only._",
    };
  }
}

/* ---------------- Page (Server) ---------------- */

export default async function NewsletterAdmin({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const editId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const existing = editId ? await getDraft(editId) : null;
  const drafts = await listDrafts();

  // Render client UI wrapper so compile results can fill the editor without saving.
  return (
    <main className="container max-w-6xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Newsletter</h1>
        <p className="text-white/70">Pick sources, compile with AI (doesn’t save), then edit, save, schedule, send.</p>
      </header>

      <ClientUI
        existing={{
          id: existing?.id || "",
          title: existing?.title || "Weekly Newsletter",
          subject: existing?.subject || "",
          markdown: existing?.markdown || "",
          audienceTag: (existing as any)?.audienceTag || "",
        }}
        drafts={drafts}
        onCompile={actionCompile}
        onSave={actionSave}
        onSchedule={actionSchedule}
        onSendNow={actionSendNow}
        onDelete={actionDelete}
      />
    </main>
  );
}

/* ---------------- Client UI ---------------- */

function formatWhen(s?: string | null) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s || "";
  }
}

// Simple markdown → HTML preview (headings, lists, paragraphs)
function renderPreview(markdown: string) {
  const html = (markdown || "")
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
  return html;
}

// ---- Client component
// We pass server actions as props (Next allows this), and manage local editor state.
"use client";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";

function ClientUI(props: {
  existing: { id: string; title: string; subject: string; markdown: string; audienceTag?: string };
  drafts: NewsletterDraft[];
  onCompile: (
    prev: { subject?: string; markdown?: string } | undefined,
    formData: FormData
  ) => Promise<{ subject?: string; markdown?: string }>;
  onSave: (formData: FormData) => Promise<void>;
  onSchedule: (formData: FormData) => Promise<void>;
  onSendNow: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [compileState, compileAction] = useFormState(props.onCompile, undefined);

  // Local editor state (only saved when user clicks Save Draft)
  const [title, setTitle] = useState(props.existing.title);
  const [subject, setSubject] = useState(props.existing.subject);
  const [markdown, setMarkdown] = useState(props.existing.markdown);
  const [audTag, setAudTag] = useState(props.existing.audienceTag || "");

  // When compile returns, fill editor (but do not save)
  useEffect(() => {
    if (compileState?.subject) setSubject(compileState.subject);
    if (compileState?.markdown) setMarkdown(compileState.markdown);
  }, [compileState?.subject, compileState?.markdown]);

  const previewHtml = useMemo(() => renderPreview(markdown), [markdown]);

  return (
    <>
      {/* 1) Choose content (compile-only) */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">1) Choose content</h2>

        <form action={compileAction} className="grid gap-3">
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
                  <input type="radio" name="preset" value={v} defaultChecked={v === "last7"} />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="date" name="dateFrom" className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
              <input type="date" name="dateTo" className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            </div>
          </fieldset>

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
              defaultValue={audTag}
              onChange={(e) => setAudTag(e.target.value)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
            />
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 w-fit">
              Compile with AI
            </button>
            <span className="text-xs text-white/60">This compiles content but does not save.</span>
          </div>
        </form>
      </section>

      {/* 2) Edit draft (local state; only saved when clicking Save) */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">2) Edit draft</h2>

        <form action={props.onSave} className="grid gap-3">
          <input type="hidden" name="id" defaultValue={props.existing.id || ""} />
          <input type="hidden" name="audienceTag" value={audTag} />
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
            <button className="self-end rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Save Draft</button>
          </div>
        </form>
      </section>

      {/* 3) Schedule / send */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">3) Schedule or send</h2>
        <div className="flex flex-wrap items-end gap-3">
          <form action={props.onSchedule} className="flex items-end gap-2">
            <input type="hidden" name="id" defaultValue={props.existing.id || ""} />
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Send at (local)</span>
              <input type="datetime-local" name="scheduleAt" className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            </label>
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Schedule</button>
          </form>

          <form action={props.onSendNow}>
            <input type="hidden" name="id" defaultValue={props.existing.id || ""} />
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Send now</button>
          </form>

          <form action={props.onDelete} className="ml-auto">
            <input type="hidden" name="id" defaultValue={props.existing.id || ""} />
            <button className="rounded-lg border border-red-400/30 text-red-200 px-3 py-2 hover:bg-red-400/10">Delete draft</button>
          </form>
        </div>
      </section>

      {/* Drafts */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Drafts</h2>
        {props.drafts.length === 0 ? (
          <p className="text-sm text-white/60">No drafts yet. Create one by saving above.</p>
        ) : (
          <ul className="space-y-2">
            {props.drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{d.title || "Untitled"}</div>
                  <div className="text-white/50">
                    {d.status}
                    {d.scheduledAt ? ` • scheduled ${formatWhen(d.scheduledAt)}` : ""}
                    {d.updatedAt ? ` • updated ${formatWhen(d.updatedAt)}` : ""}
                    {d.createdAt ? ` • created ${formatWhen(d.createdAt)}` : ""}
                    {(d as any).audienceTag ? ` • audience: ${(d as any).audienceTag}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/admin/newsletter?id=${encodeURIComponent(d.id)}`}
                    className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                  >
                    Edit
                  </a>
                  <form action={props.onDelete}>
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
    </>
  );
}
