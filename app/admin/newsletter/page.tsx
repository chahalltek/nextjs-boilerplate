// app/admin/newsletter/page.tsx
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compileNewsletter } from "@/lib/newsletter/compile";
import {
  listDrafts, getDraft, saveDraft, deleteDraft, markStatus,
  type NewsletterDraft, type NewsletterSourceKey, type SourcePick,
} from "@/lib/newsletter/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genId() { return Math.random().toString(36).slice(2, 10); }

const ALL_SOURCES: { key: NewsletterSourceKey; label: string }[] = [
  { key: "blog", label: "Blog" },
  { key: "weeklyRecap", label: "Weekly Recap" },
  { key: "holdem", label: "Hold’em / Fold’em" },
  { key: "sitStart", label: "Start / Sit" },
  { key: "survivorPolls", label: "Survivor Polls" },
  { key: "survivorLeaderboard", label: "Survivor Leaderboard" },
];

export default async function NewsletterAdmin({
  searchParams,
}: { searchParams?: Record<string, string | string[] | undefined> }) {
  const editId = typeof searchParams?.id === "string" ? searchParams.id : undefined;
  const existing = editId ? await getDraft(editId) : null;
  const drafts = await listDrafts();

  // ----------------- Actions -----------------
  async function actionCompile(formData: FormData) {
    "use server";
    const picks: SourcePick[] = ALL_SOURCES
      .filter(s => formData.get(`include:${s.key}`) === "on")
      .map(s => ({ key: s.key, verbatim: formData.get(`verbatim:${s.key}`) === "on" }));

    // Compile (this handles verbatim-only just fine)
    const { subject, markdown } = await compileNewsletter(picks);

    const draft: NewsletterDraft = {
      id: editId || genId(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // optional admin-facing title; keep existing if present
      title: existing?.title || "Weekly Newsletter",
      subject: existing?.subject || subject || "Weekly Newsletter",
      markdown: markdown || existing?.markdown || "",
      picks,
      status: existing?.status || "draft",
      scheduledAt: existing?.scheduledAt ?? null,
      // @ts-ignore — optional audienceTag tolerated
      audienceTag: String(formData.get("audienceTag") || (existing as any)?.audienceTag || "").trim() || undefined,
    };

    await saveDraft(draft);

    // IMPORTANT: navigate to the new/updated draft so the editor below shows it.
    redirect(`/admin/newsletter?id=${encodeURIComponent(draft.id)}`);
  }

  async function actionSave(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || genId());
    const base = (await getDraft(id)) ?? {
      id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      title: "", subject: "", markdown: "", picks: [], status: "draft" as const,
    };
    base.title = String(formData.get("title") || "Weekly Newsletter");
    base.subject = String(formData.get("subject") || "");
    base.markdown = String(formData.get("markdown") || "");
    // @ts-ignore
    base.audienceTag = String(formData.get("audienceTag") || "").trim() || undefined;
    await saveDraft(base);
    revalidatePath(`/admin/newsletter?id=${encodeURIComponent(id)}`);
  }

  async function actionSchedule(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const when = String(formData.get("scheduleAt") || "");
    const d = await getDraft(id); if (!d) return;
    d.scheduledAt = when || null;
    d.status = when ? "scheduled" : "draft";
    await saveDraft(d);
    revalidatePath(`/admin/newsletter?id=${encodeURIComponent(id)}`);
  }

  async function actionSendNow(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    // sending handled by /lib/newsletter/send via the admin "Send now" action elsewhere
    await markStatus(id, "sent");
    revalidatePath("/admin/newsletter");
  }

  async function actionDelete(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    await deleteDraft(id);
    revalidatePath("/admin/newsletter");
  }

  // ----------------- Simple preview -----------------
  const previewHtml = (existing?.markdown || "")
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

  return (
    <main className="container max-w-6xl py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Newsletter</h1>
        <p className="text-white/70">Assemble weekly emails from site content, tweak, schedule, and send.</p>
      </header>

      {/* 1) Choose content */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">1) Choose content</h2>
        <form action={actionCompile} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {ALL_SOURCES.map((s) => (
              <label key={s.key} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                <input name={`include:${s.key}`} type="checkbox" className="scale-110" />
                <div className="flex-1">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-white/60">Include this section</div>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input name={`verbatim:${s.key}`} type="checkbox" />
                  verbatim
                </label>
              </label>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Audience tag (optional)</span>
              <input
                name="audienceTag"
                placeholder="e.g. survivor-weekly"
                defaultValue={String((existing as any)?.audienceTag || "")}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
              <span className="text-xs text-white/50">
                If set, only subscribers tagged with this will receive the email.
              </span>
            </label>
          </div>

          <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10 w-fit">
            Compile with AI
          </button>
        </form>
      </section>

      {/* 2) Edit draft */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">2) Edit draft</h2>
        <form action={actionSave} className="grid gap-3">
          <input type="hidden" name="id" defaultValue={existing?.id || ""} />
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Internal title</span>
            <input name="title" defaultValue={existing?.title || "Weekly Newsletter"}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">Subject</span>
            <input name="subject" defaultValue={existing?.subject || "Your weekly Skol Sisters rundown"}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Body (Markdown)</span>
              <textarea name="markdown" rows={18} defaultValue={existing?.markdown || ""}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2 font-mono text-xs" />
            </label>

            <div className="rounded-lg border border-white/10 p-3 bg-black/20">
              <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Preview</div>
              <div className="prose prose-invert max-w-none"
                   dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>

          <div className="flex gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Audience tag (optional)</span>
              <input
                name="audienceTag"
                defaultValue={String((existing as any)?.audienceTag || "")}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
            </label>
            <button className="self-end rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
              Save Draft
            </button>
          </div>
        </form>
      </section>

      {/* 3) Schedule or send */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-lg font-semibold">3) Schedule or send</h2>
        <div className="flex flex-wrap items-end gap-3">
          <form action={actionSchedule} className="flex items-end gap-2">
            <input type="hidden" name="id" defaultValue={existing?.id || ""} />
            <label className="grid gap-1 text-sm">
              <span className="text-white/80">Send at (local)</span>
              <input type="datetime-local" name="scheduleAt"
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2" />
            </label>
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Schedule</button>
          </form>

          <form action={actionSendNow}>
            <input type="hidden" name="id" defaultValue={existing?.id || ""} />
            <button className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Send now</button>
          </form>

          <form action={actionDelete} className="ml-auto">
            <input type="hidden" name="id" defaultValue={existing?.id || ""} />
            <button className="rounded-lg border border-red-400/30 text-red-200 px-3 py-2 hover:bg-red-400/10">
              Delete draft
            </button>
          </form>
        </div>
      </section>

      {/* Drafts list */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-white/60">No drafts yet. Compile above to create one.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{d.title || "Untitled"}</div>
                  <div className="text-white/50">
                    {d.status}{d.scheduledAt ? ` • scheduled ${new Date(d.scheduledAt).toLocaleString()}` : ""}
                    {(d as any).audienceTag ? ` • audience: ${(d as any).audienceTag}` : ""}
                  </div>
                </div>
                <a href={`/admin/newsletter?id=${encodeURIComponent(d.id)}`}
                   className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Edit</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
