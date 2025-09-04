// app/admin/newsletter/ClientUI.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { NewsletterSourceKey } from "@/lib/newsletter/store";
import ReactMarkdown from "react-markdown";

// plugin typing shim to avoid vfile version clashes during build
import remarkGfmOrig from "remark-gfm";
import remarkBreaksOrig from "remark-breaks";
import rehypeRawOrig from "rehype-raw";
const remarkGfm: any = remarkGfmOrig as any;
const remarkBreaks: any = remarkBreaksOrig as any;
const rehypeRaw: any = rehypeRawOrig as any;
const previewHtmlFromServer = props.existing.previewHtml || "";

/* ---------- types ---------- */
type DraftListItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  scheduledAt: string | null;
  audienceTag?: string;
};

type SendTestResult = { ok: boolean; message?: string };

// Optional richer result we’ll try to read from server actions
type SendResult =
  | {
      ok: boolean;
      subject?: string;
      recipients?: number;
      batches?: number;
      sent?: number;
      details?: Array<{ id?: string; ok: boolean; count: number; error?: string }>;
    }
  | undefined;

type ScheduleResult =
  | {
      ok: boolean;
      recipients?: number;
      scheduleAt?: string;
    }
  | undefined;

/* ---------- tiny UI bits ---------- */
function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const c =
    tone === "ok"
      ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/30"
      : tone === "bad"
      ? "bg-red-400/10 text-red-200 border-red-400/30"
      : tone === "warn"
      ? "bg-amber-400/10 text-amber-200 border-amber-400/30"
      : "bg-white/5 text-white/80 border-white/15";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${c}`}>{children}</span>;
}

const toolbarBtn =
  "rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 bg-black/20";

/* ---------- component ---------- */
export default function ClientUI(props: {
  existing: {
    id: string;
    title: string;
    subject: string;
    markdown: string;
    audienceTag?: string;
    previewHtml: string; // unused now, but keep prop to avoid breaking page.tsx
  };
  drafts: DraftListItem[];
  allSources: { key: NewsletterSourceKey; label: string }[];
  neverVerbatim: NewsletterSourceKey[];

  // Server actions (provided by page.tsx)
  actionCompile: (fd: FormData) => Promise<void>;
  actionSave: (fd: FormData) => Promise<void>;

  // These may return JSON; we treat return type as unknown and parse if present
  actionSchedule: (fd: FormData) => Promise<any>;
  actionSendNow: (fd: FormData) => Promise<any>;

  /** Server action returns {ok,message} (no redirect!) */
  actionSendTest: (fd: FormData) => Promise<SendTestResult>;
  /** Deletes on server; we also optimistically remove from local list */
  actionDelete: (fd: FormData) => Promise<void>;
}) {
  const {
    existing,
    drafts: draftsProp,
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
  const [subject, setSubject] = useState(existing.subject);
  const [markdown, setMarkdown] = useState(existing.markdown);
  const [audienceTag, setAudienceTag] = useState(existing.audienceTag || "");

  /* local drafts list so Delete doesn't blank everything */
  const [drafts, setDrafts] = useState<DraftListItem[]>(draftsProp);
  useEffect(() => setDrafts(draftsProp), [draftsProp]);

  /* test email state */
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<SendTestResult | null>(null);

  /* small inline flash message (compile / save) pulled from ?compiled=1&saved=1 */
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const msgs = [
      q.get("compiled") ? "✅ Compiled!" : "",
      q.get("saved") ? "✅ Saved." : "",
      q.get("scheduled") ? "✅ Scheduled." : "",
      q.get("sent") ? "✅ Sent." : "",
    ].filter(Boolean);
    if (msgs.length) {
      setFlash(msgs.join(" "));
      // clear from URL so it doesn’t persist on refresh
      q.delete("compiled");
      q.delete("saved");
      q.delete("scheduled");
      q.delete("sent");
      const u = new URL(window.location.href);
      u.search = q.toString();
      window.history.replaceState({}, "", u.toString());
      const t = setTimeout(() => setFlash(null), 3500);
      return () => clearTimeout(t);
    }
  }, [existing.id]);

  /* sync when a different draft loads */
  useEffect(() => {
    setTitle(existing.title);
    setSubject(existing.subject);
    setMarkdown(existing.markdown);
    setAudienceTag(existing.audienceTag || "");
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

  /* ---------- send test (client handler -> server action) ---------- */
  async function onSendTest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSendingTest(true);
    setTestResult(null);
    try {
      const fd = new FormData();
      fd.set("id", existing.id);
      fd.set("subject", subject);
      fd.set("markdown", markdown);
      // IMPORTANT: server action expects "testRecipients"
      fd.set("testRecipients", testTo);
      const res = await actionSendTest(fd); // returns {ok,message}
      setTestResult(res ?? { ok: true, message: "✅ Test queued." });
    } catch (err: any) {
      setTestResult({ ok: false, message: `❌ Send failed: ${err?.message || "Unknown error"}` });
    } finally {
      setSendingTest(false);
    }
  }

  /* ---------- delete (optimistic) ---------- */
  async function onDelete(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    // optimistic UI
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    try {
      await actionDelete(fd);
    } catch {
      // rollback on error
      setDrafts(draftsProp);
    }
  }

  /* ---------- Send / Schedule indicators ---------- */
  const [sendingNow, startSendingNow] = useTransition();
  const [scheduling, startScheduling] = useTransition();

  const [sendBadge, setSendBadge] = useState<React.ReactNode>(null);
  const [scheduleBadge, setScheduleBadge] = useState<React.ReactNode>(null);
  const [recipientsBadge, setRecipientsBadge] = useState<React.ReactNode>(null);

  function extractResendId(result: SendResult): string | undefined {
    const id =
      result?.details?.find?.((d) => d.ok && d.id)?.id ||
      result?.details?.[0]?.id ||
      undefined;
    return id;
  }

  function setRecipientsCount(n?: number) {
    if (typeof n === "number" && !Number.isNaN(n)) {
      setRecipientsBadge(<Pill tone="neutral">Recipients: {n}</Pill>);
    }
  }

  async function handleSendNow() {
    setSendBadge(<Pill tone="neutral">Sending…</Pill>);
    setScheduleBadge(null);
    startSendingNow(async () => {
      try {
        const fd = new FormData();
        fd.set("id", existing.id);
        fd.set("subject", subject);
        fd.set("markdown", markdown);

        // prefer structured result; some actions may return void
        const result: SendResult = await actionSendNow(fd);
        const sent = result?.sent;
        const recipients = result?.recipients;
        const batches = result?.batches;
        const id = extractResendId(result);

        if (recipients) setRecipientsCount(recipients);

        if (typeof sent === "number" && typeof recipients === "number") {
          setSendBadge(
            <Pill tone="ok">
              Sent {sent}/{recipients}
              {batches ? ` • ${batches} batch${batches > 1 ? "es" : ""}` : null}
              {id ? (
                <>
                  {" "}
                  •{" "}
                  <a
                    className="underline"
                    href={`https://resend.com/emails/${id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Resend #{id.slice(0, 8)}
                  </a>
                </>
              ) : null}
            </Pill>
          );
        } else {
          setSendBadge(<Pill tone="ok">Sent ✅</Pill>);
        }
      } catch (e: any) {
        setSendBadge(<Pill tone="bad">Send failed: {e?.message || "Error"}</Pill>);
      }
    });
  }

  async function handleSchedule(formEl: HTMLFormElement) {
    setScheduleBadge(<Pill tone="neutral">Scheduling…</Pill>);
    setSendBadge(null);
    startScheduling(async () => {
      try {
        const fd = new FormData(formEl);
        fd.set("id", existing.id);
        fd.set("subject", subject);
        fd.set("markdown", markdown);

        const result: ScheduleResult = await actionSchedule(fd);
        const whenIso = result?.scheduleAt;
        const recipients = result?.recipients;

        if (recipients) setRecipientsCount(recipients);

        if (whenIso) {
          setScheduleBadge(
            <Pill tone="ok">Scheduled for {new Date(whenIso).toLocaleString()}</Pill>
          );
        } else {
          setScheduleBadge(<Pill tone="ok">Scheduled ⏰</Pill>);
        }
      } catch (e: any) {
        setScheduleBadge(<Pill tone="bad">Schedule failed: {e?.message || "Error"}</Pill>);
      }
    });
  }

  /* ---------- preview content ---------- */
  const previewMd = useMemo(() => markdown || "", [markdown]);

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
          <div className="flex items-center gap-2">
            {recipientsBadge}
            {flash && <span className="text-sm text-emerald-300">{flash}</span>}
          </div>
        </div>
        <form action={actionCompile} className="grid gap-3">
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
            <button type="button" className={toolbarBtn} onClick={() => insert("\n\n", "")}>
              ¶ Break
            </button>
            <button type="button" className={toolbarBtn} onClick={() => insert("\n\n---\n\n")}>
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
            </label>
            <div className="rounded-lg border border-white/10 p-3 bg-black/20">
              <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Preview</div>
              <div className="prose prose-invert max-w-none [&_p]:mb-4">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
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
        <h2 className="text-lg font-semibold">Send a test</h2>
        <form onSubmit={onSendTest} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm min-w-[260px] flex-1">
            <span className="text-white/80">Recipient(s)</span>
            <input
              name="to"
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
        {testResult && (
          <p className={`text-sm ${testResult.ok ? "text-emerald-300" : "text-red-300"}`}>
            {testResult.message}
          </p>
        )}
      </section>

      {/* 3) Schedule / Send */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">3) Schedule or send</h2>
          <div className="flex items-center gap-2">
            {scheduleBadge}
            {sendBadge}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Schedule (client handled so we can show precise result) */}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSchedule(e.currentTarget);
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Send at (local)</span>
              <input
                type="datetime-local"
                name="scheduleAt"
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </label>
            <button
              disabled={scheduling}
              className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 disabled:opacity-50"
            >
              {scheduling ? "Scheduling…" : "Schedule"}
            </button>
          </form>

          {/* Send now (client handled so we can show precise result) */}
          <button
            onClick={handleSendNow}
            disabled={sendingNow}
            className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 disabled:opacity-50"
          >
            {sendingNow ? "Sending…" : "Send now"}
          </button>
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
                  <button
                    onClick={() => onDelete(d.id)}
                    className="rounded border border-red-400/30 text-red-200 px-2 py-1 text-xs hover:bg-red-400/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
