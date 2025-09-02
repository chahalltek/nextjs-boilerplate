// app/admin/newsletter/page.tsx
import { redirect } from "next/navigation";
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

import { listDir, getFile } from "@/lib/github";
import matter from "gray-matter";
import ClientUI from "./ClientUI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genId = () => Math.random().toString(36).slice(2, 10);

// ----- Sources shown in the UI ------------------------------------------------
const ALL_SOURCES: { key: NewsletterSourceKey; label: string }[] = [
  { key: "blog", label: "Blog" },
  { key: "weeklyRecap", label: "Weekly Recap" },
  { key: "holdem", label: "Hold’em / Fold’em" },
  { key: "sitStart", label: "Start / Sit" },
  { key: "survivorPolls", label: "Survivor Polls" },
  { key: "survivorLeaderboard", label: "Survivor Leaderboard" },
];
const NEVER_VERBATIM: NewsletterSourceKey[] = ["survivorPolls", "survivorLeaderboard"];

// ----- Date helpers -----------------------------------------------------------
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

// ----- Content fallbacks (guards if compiler omits a section) -----------------
const b64 = (s: string) => Buffer.from(s || "", "base64").toString("utf8");
function toTime(dateStr?: string) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (!isNaN(d as any)) return d.getTime();
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return 0;
}

type Post = { slug: string; title: string; date: string; content: string; excerpt?: string };
type Recap = { slug: string; title: string; date: string; content: string; excerpt?: string };

async function pullMarkdownFromDir(
  dir: string,
  { dateFrom, dateTo, limit = 3 }: { dateFrom?: string; dateTo?: string; limit?: number } = {}
) {
  const items = await listDir(dir).catch(() => []);
  const files = items.filter((it: any) => it.type === "file" && /\.mdx?$/i.test(it.name));
  const out: { slug: string; title: string; date: string; content: string; excerpt?: string }[] = [];

  for (const f of files) {
    const file = await getFile(f.path).catch(() => null);
    if (!file?.contentBase64) continue;

    const raw = b64(file.contentBase64);
    const parsed = matter(raw);
    const fm: any = parsed.data || {};

    const draft = fm.draft === true || String(fm.draft ?? "").trim().toLowerCase() === "true";
    const publishedStr = String(fm.published ?? fm.active ?? "true").toLowerCase();
    const visible = !["false", "0", "no"].includes(publishedStr);
    const publishAt = fm.publishAt ? new Date(fm.publishAt) : null;
    const scheduledInFuture = publishAt && Date.now() < publishAt.getTime();
    if (draft || !visible || scheduledInFuture) continue;

    const dt = toTime(fm.date || "");
    const fromOK = dateFrom ? dt >= toTime(dateFrom) : true;
    const toOK = dateTo ? dt <= toTime(dateTo) : true;
    if (!fromOK || !toOK) continue;

    out.push({
      slug: f.name.replace(/\.(md|mdx)$/i, ""),
      title: fm.title || f.name.replace(/\.(md|mdx)$/i, ""),
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      content: (parsed.content || "").trim(),
    });
  }

  out.sort((a, b) => toTime(b.date) - toTime(a.date));
  return out.slice(0, Math.max(1, limit));
}

async function fallbackWeeklyRecap(dateFrom?: string, dateTo?: string) {
  const recaps = await pullMarkdownFromDir("content/recaps", { dateFrom, dateTo, limit: 1 });
  if (!recaps.length) return "";
  const r = recaps[0];
  return `\n\n## Weekly Recap\n\n**${r.title}** (${r.date})\n\n${r.content}\n`;
}

async function fallbackBlog(dateFrom?: string, dateTo?: string) {
  const posts = await pullMarkdownFromDir("content/posts", { dateFrom, dateTo, limit: 3 });
  if (!posts.length) return "";
  const items = posts
    .map((p) => {
      const firstPara = (p.excerpt || p.content).split(/\n\s*\n/)[0]?.trim() || "";
      return `- **${p.title}** (${p.date}) — ${firstPara}`;
    })
    .join("\n");
  return `\n\n## From the Blog\n\n${items}\n`;
}

// ----- Page -------------------------------------------------------------------
export default async function NewsletterAdmin({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const editId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const flash = {
    compiled: searchParams?.compiled === "1",
    saved: searchParams?.saved === "1",
    test: searchParams?.test === "1",
  };

  const existing = editId ? await getDraft(editId) : null;
  const drafts = await listDrafts();

  // Used to force a fresh mount of ClientUI when lists change
  const refreshKey = drafts.map((d) => `${d.id}:${d.updatedAt || ""}`).join("|");

  // ---------- Server actions ----------
  async function actionCompile(formData: FormData) {
    "use server";
    const { compileNewsletter } = await import("@/lib/newsletter/compile");

    const picks: SourcePick[] = ALL_SOURCES
      .filter((s) => formData.get(`include:${s.key}`) === "on")
      .map((s) => ({
        key: s.key,
        verbatim: !NEVER_VERBATIM.includes(s.key) && formData.get(`verbatim:${s.key}`) === "on",
      }));

    const perSource: Record<
      NewsletterSourceKey,
      { dateFrom?: string; dateTo?: string; limit?: number }
    > = {} as any;

    for (const s of ALL_SOURCES) {
      const from = String(formData.get(`from:${s.key}`) || "") || undefined;
      const to = String(formData.get(`to:${s.key}`) || "") || undefined;
      const limS = String(formData.get(`limit:${s.key}`) || "");
      const limit = limS ? Math.max(1, Math.min(20, parseInt(limS, 10) || 0)) : undefined;
      if (from || to || limit) perSource[s.key] = { dateFrom: from, dateTo: to, limit };
    }

    const preset = (String(formData.get("preset") || "") || undefined) as string | undefined;
    const globalDateFrom = String(formData.get("dateFrom") || "") || undefined;
    const globalDateTo = String(formData.get("dateTo") || "") || undefined;
    const { dateFrom, dateTo } = computeRange(preset, globalDateFrom, globalDateTo);

    // Compile via main pipeline
    let { subject, markdown } = await compileNewsletter(picks, {
      dateFrom,
      dateTo,
      stylePrompt: String(formData.get("stylePrompt") || "") || undefined,
      perSource,
    });

    // --- Guards: if a selected section didn't come back, inject a sensible fallback
    const wantsRecap = picks.some((p) => p.key === "weeklyRecap");
    const wantsBlog = picks.some((p) => p.key === "blog");
    const hasRecap = /\b(Weekly Recap|CWS)\b/i.test(markdown || "");
    const hasBlog = /\b(From the Blog|Blog)\b/i.test(markdown || "");

    if (wantsRecap && !hasRecap) {
      try { markdown += await fallbackWeeklyRecap(dateFrom, dateTo); } catch {}
    }
    if (wantsBlog && !hasBlog) {
      try { markdown += await fallbackBlog(dateFrom, dateTo); } catch {}
    }
    // --------------------------------------------------------------------------

    const draft = await saveDraft({
      subject: subject || "Weekly Newsletter",
      markdown: markdown || "",
      picks,
      status: "draft",
      scheduledAt: null,
      audienceTag: String(formData.get("audienceTag") || "").trim() || undefined,
      title: "Weekly Newsletter",
    });

    // Inline + banner feedback; nonce busts any soft-cache
    redirect(`/admin/newsletter?id=${encodeURIComponent(draft.id)}&compiled=1&nonce=${Date.now()}`);
  }

  async function actionSave(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || genId());
    const base =
      (await getDraft(id)) ??
      ({
        id,
        createdAt: "",
        updatedAt: "",
        subject: "",
        markdown: "",
        picks: [],
        status: "draft",
      } as NewsletterDraft);

    await saveDraft({
      ...base,
      title: String(formData.get("title") || "Weekly Newsletter"),
      subject: String(formData.get("subject") || ""),
      markdown: String(formData.get("markdown") || ""),
      audienceTag: String(formData.get("audienceTag") || "").trim() || undefined,
    });
    redirect(`/admin/newsletter?id=${encodeURIComponent(id)}&saved=1&nonce=${Date.now()}`);
  }

  async function actionSchedule(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const when = String(formData.get("scheduleAt") || "");
    const d = await getDraft(id);
    if (!d) return;
    await saveDraft({ ...d, scheduledAt: when || null, status: when ? "scheduled" : "draft" });
    redirect(`/admin/newsletter?id=${encodeURIComponent(id)}&nonce=${Date.now()}`);
  }

  async function actionSendNow(formData: FormData) {
    "use server";
    const { sendNewsletter } = await import("@/lib/newsletter/send");
    const id = String(formData.get("id") || "");
    const d = await getDraft(id);
    if (!d) return;
    await sendNewsletter(d);
    await markStatus(id, "sent");
    redirect(`/admin/newsletter?nonce=${Date.now()}`);
  }

  async function actionSendTest(formData: FormData) {
    "use server";
    try {
      const { sendNewsletter } = await import("@/lib/newsletter/send");
      const id = String(formData.get("id") || "");
      const subject = String(formData.get("subject") || "");
      const markdown = String(formData.get("markdown") || "");
      const toRaw = String(formData.get("testRecipients") || "");
      const recipients = toRaw
        .split(/[,\s;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const base = id ? await getDraft(id) : null;
      const draft: NewsletterDraft =
        base
          ? { ...base, subject: subject || base.subject, markdown: markdown || base.markdown }
          : {
              id: genId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              subject: subject || "Newsletter Test",
              markdown,
              picks: [],
              status: "draft",
              scheduledAt: null,
              audienceTag: undefined,
            };

      if (recipients.length > 0) {
        await sendNewsletter(draft, { recipients }); // BCC-only in send.ts
      } else {
        console.warn("Send test skipped: no recipients provided.");
      }
    } catch (e) {
      console.error("Send test failed:", e);
    }

    const idParam = String(formData.get("id") || "");
    redirect(
      `/admin/newsletter${idParam ? `?id=${encodeURIComponent(idParam)}` : ""}&test=1&nonce=${Date.now()}`
    );
  }

  async function actionDelete(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    await deleteDraft(id);
    // Force a fresh RSC payload so the list never shows ghost items
    redirect(`/admin/newsletter?nonce=${Date.now()}`);
  }

  // ---------- Editor preview (ClientUI renders Markdown; we still provide HTML for legacy) ----------
  const previewHtml = (existing?.markdown || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => {
      if (l.startsWith("# ")) return `<h1 class="text-xl font-semibold mb-2">${l.slice(2)}</h1>`;
      if (l.startsWith("## ")) return `<h2 class="text-lg font-semibold mt-4 mb-2">${l.slice(3)}</h2>`;
      if (l.startsWith("### ")) return `<h3 class="font-semibold mt-3 mb-1">${l.slice(4)}</h3>`;
      if (l.startsWith("- ")) return `<li>${l.slice(2)}</li>`;
      if (!l.trim()) return "<br/>";
      return `<p class="opacity-80">${l}</p>`;
    })
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="list-disc ml-5 space-y-1">$1</ul>');

  // Display status mapping without changing storage enum
  const prettyDrafts = drafts.map((d) => {
    let display = "draft";
    if (d.status === "sent") display = "sent";
    else if (d.status === "scheduled") display = "scheduled";
    else if (d.createdAt && d.updatedAt && d.createdAt === d.updatedAt) display = "compiled";
    else display = "edited";
    return {
      id: d.id,
      title: d.title || "Weekly Newsletter",
      status: display as "compiled" | "edited" | "scheduled" | "sent",
      updatedAt: d.updatedAt,
      scheduledAt: d.scheduledAt ?? null,
      audienceTag: (d as any).audienceTag,
    };
  });

  return (
    <main className="container max-w-6xl py-8 space-y-4">
      {/* Top banner still there for completeness */}
      {(flash.compiled || flash.saved || flash.test) && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 px-3 py-2">
          {flash.compiled && "Draft compiled successfully."}
          {flash.saved && " Draft saved."}
          {flash.test && " Test sent (BCC) to the specified addresses."}
        </div>
      )}

      return (
  <ClientUI
    existing={{
      id: existing?.id || "",
      title: existing?.title || "Weekly Newsletter",
      subject: existing?.subject || "Your weekly Hey Skol Sister rundown!",
      markdown: existing?.markdown || "",
      audienceTag: (existing as any)?.audienceTag,
      previewHtml,
    }}
    drafts={prettyDrafts}
    allSources={ALL_SOURCES}
    neverVerbatim={NEVER_VERBATIM}
    actionCompile={actionCompile}
    actionSave={actionSave}
    actionSchedule={actionSchedule}
    actionSendNow={actionSendNow}
    actionSendTest={actionSendTest}
    actionDelete={actionDelete}
  />
);

    </main>
  );
}
