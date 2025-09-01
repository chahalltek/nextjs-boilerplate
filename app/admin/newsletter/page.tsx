// app/admin/newsletter/page.tsx
import { redirect } from "next/navigation";
import { compileNewsletter } from "@/lib/newsletter/compile";
import {
  listDrafts, getDraft, saveDraft, deleteDraft, markStatus,
  type NewsletterDraft, type NewsletterSourceKey, type SourcePick,
} from "@/lib/newsletter/store";
import { sendNewsletter } from "@/lib/newsletter/send";
import ClientUI from "./ClientUI";

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
  const daysAgo = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
  if (preset === "last7")  return { dateFrom: toISO(daysAgo(7)),  dateTo: toISO(now) };
  if (preset === "last14") return { dateFrom: toISO(daysAgo(14)), dateTo: toISO(now) };
  if (preset === "last30") return { dateFrom: toISO(daysAgo(30)), dateTo: toISO(now) };
  if (preset === "season") {
    const seasonStart = new Date(now.getFullYear(), 7, 1); // Aug 1
    return { dateFrom: toISO(seasonStart), dateTo: toISO(now) };
  }
  return { dateFrom: undefined, dateTo: undefined };
}

export default async function NewsletterAdmin({
  searchParams,
}: { searchParams?: Record<string, string | string[] | undefined> }) {
  const editId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const existing = editId ? await getDraft(editId) : null;
  const drafts = await listDrafts();

  // ---------- Server actions ----------
  async function actionCompile(formData: FormData) {
    "use server";
    const picks: SourcePick[] = ALL_SOURCES
      .filter(s => formData.get(`include:${s.key}`) === "on")
      .map(s => ({
        key: s.key,
        verbatim: !NEVER_VERBATIM.includes(s.key) && formData.get(`verbatim:${s.key}`) === "on",
      }));

    const perSource: Record<NewsletterSourceKey, { dateFrom?: string; dateTo?: string; limit?: number }> = {} as any;
    for (const s of ALL_SOURCES) {
      const from = String(formData.get(`from:${s.key}`) || "") || undefined;
      const to   = String(formData.get(`to:${s.key}`)   || "") || undefined;
      const limS = String(formData.get(`limit:${s.key}`) || "");
      const limit = limS ? Math.max(1, Math.min(20, parseInt(limS, 10) || 0)) : undefined;
      if (from || to || limit) perSource[s.key] = { dateFrom: from, dateTo: to, limit };
    }

    const preset = String(formData.get("preset") || "") || undefined;
    const globalDateFrom = String(formData.get("dateFrom") || "") || undefined;
    const globalDateTo   = String(formData.get("dateTo")   || "") || undefined;
    const { dateFrom, dateTo } = computeRange(preset, globalDateFrom, globalDateTo);

    const { subject, markdown } = await compileNewsletter(picks, {
      dateFrom, dateTo,
      stylePrompt: String(formData.get("stylePrompt") || "") || undefined,
      perSource,
    });

    // Create draft (status remains "draft" in storage; UI will show "compiled")
    const draft = await saveDraft({
      subject: subject || "Weekly Newsletter",
      markdown,
      picks,
      status: "draft",
      scheduledAt: null,
      audienceTag: String(formData.get("audienceTag") || "").trim() || undefined,
      title: "Weekly Newsletter",
    });
    redirect(`/admin/newsletter?id=${encodeURIComponent(draft.id)}`);
  }

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

  async function actionSendTest(formData: FormData) {
    "use server";
    try {
      const id = String(formData.get("id") || "");
      const subject = String(formData.get("subject") || "");
      const markdown = String(formData.get("markdown") || "");
      const toRaw = String(formData.get("testRecipients") || "");
      const recipients = toRaw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);

      const base = id ? await getDraft(id) : null;
      const draft: NewsletterDraft = base
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

      await sendNewsletter(draft, { recipients });
    } catch (e) {
      console.error("Send test failed:", e);
    }
    // Come back to the same page (keep editing)
    redirect(`/admin/newsletter?id=${encodeURIComponent(String(formData.get("id") || ""))}`);
  }

  async function actionDelete(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    await deleteDraft(id);
    redirect(`/admin/newsletter`);
  }

  // ---------- Preview HTML for the editor preview ----------
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
      actionSendTest={actionSendTest}
      actionDelete={actionDelete}
    />
  );
}
