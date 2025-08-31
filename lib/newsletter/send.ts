// lib/newsletter/send.ts
import type { NewsletterDraft } from "./store";
import { listSubscribers } from "@/lib/subscribers/store";

function mdToBasicHtml(md: string) {
  return md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => {
      if (l.startsWith("# ")) return `<h1>${l.slice(2)}</h1>`;
      if (l.startsWith("## ")) return `<h2>${l.slice(3)}</h2>`;
      if (l.startsWith("### ")) return `<h3>${l.slice(4)}</h3>`;
      if (l.startsWith("- ")) return `<li>${l.slice(2)}</li>`;
      if (!l.trim()) return "";
      return `<p>${l}</p>`;
    })
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
}

async function sendWithResend(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM || "Skol Sisters <news@heyskolsister.com>";
  if (!key) return false;

  // Lazy import so build doesn’t require the pkg if unset
  const { Resend } = await import("resend");
  const resend = new Resend(key);

  // Chunk to avoid any provider limits (50 is safe)
  const chunk = <T,>(arr: T[], n = 50) => arr.reduce<T[][]>((a, c, i) => {
    const k = Math.floor(i / n); (a[k] ||= []).push(c); return a;
  }, []);

  const batches = chunk(to, 50);
  for (const batch of batches) {
    await resend.emails.send({ from, to: batch, subject, html }).catch((e) => {
      console.error("Resend error:", e?.message || e);
    });
  }
  return true;
}

export async function sendNewsletter(draft: NewsletterDraft) {
  const subs = await listSubscribers(draft as any as string | undefined /* legacy passthrough */);
  const to = subs.map((s) => s.email).filter(Boolean);

  if (!to.length) {
    console.log(`[newsletter] No subscribers. Subject "${draft.subject}"`);
    return { sent: 0 };
  }

  const html = mdToBasicHtml(draft.markdown);

  const ok = await sendWithResend(to, draft.subject, html);
  if (!ok) {
    console.log(`[newsletter] No email provider configured. Would send "${draft.subject}" to ${to.length} subs.`);
  } else {
    console.log(`[newsletter] Sent "${draft.subject}" to ${to.length} recipients`);
  }
  return { sent: to.length };
}
