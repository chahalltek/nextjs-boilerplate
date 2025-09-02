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

// ----- CWS fallback fetch (guards against empty Weekly Recap in compile) ------
const CWS_DIR = "content/recaps";
const b64 = (s: string) => Buffer.from(s || "", "base64").toString("utf8");

type Recap = {
  slug: string;
  title: string;
  date: string;
  content: string;
  excerpt?: string;
};

function toTime(dateStr?: string) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (!isNaN(d as any)) return d.getTime();
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  return 0;
}

async function pullCwsWithinRange(dateFrom?: string, dateTo?: string, limit = 1): Promise<Recap[]> {
  const items = await listDir(CWS_DIR).catch(() => []);
  const files = items.filter((it: any) => it.type === "file" && /\.mdx?$/i.test(it.name));

  const recaps: Recap[] = [];
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

    // Optional date filtering
    const dt = toTime(fm.date || "");
    const fromOK = dateFrom ? dt >= toTime(dateFrom) : true;
    const toOK = dateTo ? dt <= toTime(dateTo) : true;
    if (!fromOK || !toOK) continue;

    recaps.push({
      slug: f.name.replace(/\.(md|mdx)$/i, ""),
      title: fm.title || f.name.replace(/\.(md|mdx)$/i, ""),
      date: fm.date || "",
      excerpt: fm.excerpt || "",
      content: parsed.content || "",
    });
  }

  recaps.sort((a, b) => toTime(b.date) - toTime(a.date));
  return recaps.slice(0, Math.max(1, limit));
}

// ----- Page -------------------------------------------------------------------
export default async function NewsletterAdmin({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const editId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const compiledFlash = searchParams?.compiled === "1";
  const existing = editId ? await getDraft(editId) : null;
  const drafts = await listDrafts();

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

    // --- Guard: ensure Weekly Recap made it in if requested -------------------
    const wantsCws = picks.some((p) => p.key === "weeklyRecap");
    const hasCwsAlready = /\b(Weekly Recap|CWS)\b/i.test(markdown || "");
    if (wantsCws && !hasCwsAlready) {
      try {
        const cws = await pullCwsWithinRange(dateFrom, dateTo, 1);
        if (cws.length) {
          const block =
            `\n\n## Weekly Recap\n\n` +
            `**${cws[0].title}** (${cws[0].date})\n\n` +
            `${cws[0].content.trim()}\n`;
          markdown = (markdown || "").trim() + block;
        }
      } catch (e) {
        console.error("CWS fallback failed:", e);
      }
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

    // Show a small confirmation banner on return
    redirect(`/admin/newsletter?id=${encodeURIComponent(draft.id)}&compiled=1`);
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
    const { sendNewsletter } = await import("@/lib/newsletter/send");
    const id = String(formData.get("id") || "");
    const d = await getDraft(id);
    if (!d) return;
    await sendNewsletter(d); // uses BCC + chunking under the hood
    await markStatus(id, "sent");
    redirect(`/admin/newsletter`);
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
        .split(/[,\s;]+/) // commas, spaces, semicolons
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
        // SAFE: sendNewsletter(draft, { recipients }) sends ONLY to these addresses (via BCC)
        await sendNewsletter(draft, { recipients });
      } else {
        console.warn("Send test skipped: no recipients provided.");
      }
    } catch (e) {
      console.error("Send test failed:", e);
    }

    const idParam = String(formData.get("id") || "");
    redirect(`/admin/newsletter${idParam ? `?id=${encodeURIComponent(idParam)}` : ""}`);
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
    <main className="container max-w-6xl py-8 space-y-4">
      {compiledFlash && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 px-3 py-2">
          Draft compiled successfully. You can edit and send below.
        </div>
      )}

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
    </main>
  );
}
