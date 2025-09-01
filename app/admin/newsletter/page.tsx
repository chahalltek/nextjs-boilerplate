// app/admin/newsletter/page.tsx
import { redirect } from "next/navigation";
import { compileNewsletter } from "@/lib/newsletter/compile";
import {
  listDrafts, getDraft, saveDraft, deleteDraft, markStatus,
  type NewsletterDraft, type NewsletterSourceKey, type SourcePick,
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

/* ---------------- Server Actions ---------------- */

// Compile content but DO NOT save a draft.
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

  return { subject, markdown };
}

async function actionSave(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const existing = id ? await getDraft(id) : null;

  const saved = await saveDraft({
    id: existing?.id,
    title: String(formData.get("title") || "Weekly Newsletter"),
    subject: String(formData.get("subject") || ""),
    markdown: String(formData.get("markdown") || ""),
    audienceTag: String(formData.get("audienceTag") || "").trim() || undefined,
    picks: existing?.picks ?? [],
    status: existing?.status ?? "draft",
    scheduledAt: existing?.scheduledAt ?? null,
  });

  redirect(`/admin/newsletter?id=${encodeURIComponent(saved.id)}`);
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

/* ---------------- Page (Server) ---------------- */

import ClientUI from "./ClientUI";

export default async function NewsletterAdmin({
  searchParams,
}: { searchParams?: Record<string, string | string[] | undefined> }) {
  const editId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const existing = editId ? await getDraft(editId) : null;
  const drafts = await listDrafts();

  return (
    <ClientUI
      ALL_SOURCES={ALL_SOURCES}
      NEVER_VERBATIM={NEVER_VERBATIM}
      existing={{
        id: existing?.id || "",
        title: existing?.title || "Weekly Newsletter",
        subject: existing?.subject || "Your weekly Skol Sisters rundown",
        markdown: existing?.markdown || "",
        audienceTag: (existing as any)?.audienceTag || "",
      }}
      drafts={drafts.map(d => ({
        id: d.id,
        title: d.title || "Untitled",
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        scheduledAt: d.scheduledAt || null,
        audienceTag: (d as any).audienceTag || "",
      }))}
      actions={{
        compile: actionCompile,   // called directly from the client (no saving)
        save: actionSave,
        schedule: actionSchedule,
        sendNow: actionSendNow,
        remove: actionDelete,
      }}
    />
  );
}
