// lib/newsletter/send.ts
import type { NewsletterDraft } from "./store";
import { listSubscribers } from "@/lib/subscribers/store";

function mdToBasicHtml(md: string) {
  // Very light MD → HTML for email-safe rendering
  return md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => {
      if (l.startsWith("# ")) return `<h1>${escapeHtml(l.slice(2))}</h1>`;
      if (l.startsWith("## ")) return `<h2>${escapeHtml(l.slice(3))}</h2>`;
      if (l.startsWith("### ")) return `<h3>${escapeHtml(l.slice(4))}</h3>`;
      if (l.startsWith("- ")) return `<li>${escapeHtml(l.slice(2))}</li>`;
      if (!l.trim()) return "<br/>";
      return `<p>${escapeHtml(l)}</p>`;
    })
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function sendWithResend(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM || "Skol Sisters <news@heyskolsister.com>";
  if (!key) return false;

  // Lazy import so the build doesn’t require the pkg if unset
  const { Resend } = await import("resend");
  const resend = new Resend(key);

  // Chunk to avoid provider limits
  const chunk = <T,>(arr: T[], n = 50) =>
    arr.reduce<T[][]>((a, c, i) => {
      const k = Math.floor(i / n);
      (a[k] ||= []).push(c);
      return a;
    }, []);

  for (const batch of chunk(to, 50)) {
    try {
      await resend.emails.send({ from, to: batch, subject, html });
    } catch (e: any) {
      console.error("Resend error:", e?.message || e);
    }
  }
  return true;
}

function normalizeEmails(input: string[] | undefined | null) {
  const out = new Set<string>();
  (input || [])
    .flatMap((s) => s.split(/[,;\s]+/))
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    .forEach((e) => out.add(e));
  return Array.from(out);
}

export async function sendNewsletter(
  draft: NewsletterDraft,
  opts?: { recipients?: string[]; audienceTag?: string | null }
): Promise<{ sent: number; to: string[] }> {
  // 1) Who to send to
  let to: string[] = [];
  const override = normalizeEmails(opts?.recipients);
  if (override.length) {
    to = override;
  } else {
    const audience = (opts?.audienceTag ?? (draft as any)?.audienceTag) || undefined;
    const subs = await listSubscribers(audience);
    to = subs.map((s) => String(s.email || "").trim().toLowerCase()).filter(Boolean);
  }

  if (!to.length) {
    console.log(`[newsletter] No recipients. Subject "${draft.subject}"`);
    return { sent: 0, to: [] };
  }

  // 2) Render HTML (no auto-footer)
  const html = mdToBasicHtml(draft.markdown);

  // 3) Send
  const ok = await sendWithResend(to, draft.subject, html);
  if (!ok) {
    console.log(
      `[newsletter] No email provider configured. Would send "${draft.subject}" to ${to.length} recipients.`
    );
    return { sent: 0, to };
  }

  console.log(`[newsletter] Sent "${draft.subject}" to ${to.length} recipients`);
  return { sent: to.length, to };
}
