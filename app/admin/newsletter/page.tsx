// app/admin/newsletter/page.tsx
import { redirect } from "next/navigation";
import ClientUI from "./ClientUI";
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

// map internal status + timestamps -> display status
function displayStatus(d: NewsletterDraft): string {
  if (d.status === "sent") return "sent";
  if (d.status === "scheduled") return "scheduled";
  // For drafts: created === updated means compiled but not edited yet
  if (d.status === "draft") {
    if (d.createdAt && d.updatedAt && d.createdAt === d.updatedAt) return "compiled";
    return "edited";
  }
  return d.status;
}

export default async function NewsletterAdmin({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const editId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const existing = editId ? await getDraft(editId) : null;
  const drafts = await listDrafts();

  // ---------- Server Actions ----------

  async function actionCompile(formData: FormData) {
    "use server";

    // which sources + verbatim flags
    const picks: SourcePick[] = ALL_SOURCES
      .filter((s) => formData.get(`include:${s.key}`) === "on")
      .map((s) => ({
        key: s.key,
        verbatim: !NEVER_VERBATIM.includes(s.key) && formData.get(`verbatim:${s.key}`) === "on",
      }));

    // per-source overrides
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

    // global range
    const preset = String(formData.get("preset") || "") || undefined;
    const globalDateFrom = String(formData.get("dateFrom") || "") || undefined;
    const globalDateTo = String(formData.get("dateTo") || "") || undefined;
    const { dateFrom, dateTo } = computeRange(preset, globalDateFrom, globalDateTo);

    // compile (OpenAI or fallback)
    let subject = "Weekly Newsletter";
    let markdown = "";
    try {
      const out = await compileNewsletter(picks, {
        dateFrom,
        dateTo,
        stylePrompt: String(formData.get("stylePrompt") || "") || undefined,
        perSource,
      });
      subject = out.subject || subject;
      markdown = out.markdown || "";
    } catch (e) {
      // Make sure the UI doesn't crash; draft will indicate failure text
      subject = "Newsletter (compile failed)";
      markdown =
        "_Compile failed. Check your OpenAI env vars and content paths (content/posts, content/recaps, data/polls)._";
    }

    // save a draft (status = draft). createdAt === updatedAt -> displays as "compiled"
    const draft = await saveDraft({
      subject,
      markdown,
      picks,
      status: "draft",
      scheduledAt: null,
      audienceTag: String(formData.get("audienceTag") || "").trim() || undefined,
      title: "Weekly Newsletter",
    });

    // redirect loads the draft and pre-fills the editor
    redirect(`/admin/newsletter?id=${encodeURIComponent(draft.id)}`);
  }

  async function actionSave(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
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
      // status remains "draft"; display will show "edited" now that updatedAt changes
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

  // NEW: send a test email to specific addresses
  async function actionSendTest(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const raw = String(formData.get("testRecipients") || "");
    const emails = raw
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && /.+@.+\..+/.test(s));

    if (!emails.length) {
      // just reload the page if nothing valid was given
      redirect(`/admin/newsletter?id=${encodeURIComponent(id)}`);
    }

    const d = await getDraft(id);
    if (!d) return;

    // Cast to avoid type friction if sendNewsletter is typed for single-arg.
    await (sendNewsletter as any)(d, { testEmails: emails });
    // Keep status; this is only a test send.
    redirect(`/admin/newsletter?id=${encodeURIComponent(id)}`);
  }

  async function actionDelete(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    await deleteDraft(id);
    redirect(`/admin/newsletter`);
  }

  // -------- Prepare props for ClientUI --------
  const prettyDrafts = drafts.map((d) => ({
    id: d.id,
    title: d.title || "Weekly Newsletter",
    status: displayStatus(d),
    updatedAt: d.updatedAt,
    scheduledAt: d.scheduledAt ?? null,
    audienceTag: (d as any).audienceTag as string | undefined,
  }));

  const previewHtml = (existing?.markdown || "")
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

  return (
    <ClientUI
      existing={{
        id: existing?.id || "",
        title: existing?.title || "Weekly Newsletter",
        subject: existing?.subject || "Your weekly Skol Sisters rundown",
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
      actionSendTest={actionSendTest} // <- FIX: provide to ClientUI
      actionDelete={actionDelete}
    />
  );
}
